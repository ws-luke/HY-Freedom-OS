from __future__ import annotations

import ctypes
import hashlib
import json
import os
import threading
from ctypes import wintypes
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import MetaTrader5 as mt5
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


APP_NAME = "Freedom MT5 Sync Service"
APP_VERSION = "1.2.0"
SCHEMA_VERSION = 1
SYNC_LOCK = threading.Lock()
CRYPTPROTECT_UI_FORBIDDEN = 0x01


class _DataBlob(ctypes.Structure):
    _fields_ = [
        ("cbData", wintypes.DWORD),
        ("pbData", ctypes.POINTER(ctypes.c_ubyte)),
    ]


def _allowed_origins() -> list[str]:
    configured = os.getenv("FREEDOM_OS_ALLOWED_ORIGINS", "").strip()
    if configured:
        return [item.strip() for item in configured.split(",") if item.strip()]

    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ]


app = FastAPI(title=APP_NAME, version=APP_VERSION, docs_url=None, redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)


class SyncRequest(BaseModel):
    accountId: str = Field(min_length=1)
    login: str = Field(min_length=1)
    server: str = Field(min_length=1)
    password: str | None = None
    rememberPassword: bool = False
    since: str | None = None


def _credential_directory() -> Path:
    local_app_data = os.getenv("LOCALAPPDATA", "").strip()
    if not local_app_data:
        raise RuntimeError("Windows LOCALAPPDATA 無法使用，不能安全保存 MT5 credential。")
    return Path(local_app_data) / "FreedomOS" / "mt5-credentials"


def _credential_path(account_id: str) -> Path:
    # Account IDs never become path components directly. This also keeps the
    # vault opaque if somebody casually browses the directory.
    digest = hashlib.sha256(account_id.encode("utf-8")).hexdigest()
    return _credential_directory() / f"{digest}.bin"


def _dpapi_protect(value: bytes) -> bytes:
    if os.name != "nt":
        raise RuntimeError("MT5 credential 安全保存僅支援 Windows DPAPI。")

    buffer = ctypes.create_string_buffer(value)
    input_blob = _DataBlob(
        len(value),
        ctypes.cast(buffer, ctypes.POINTER(ctypes.c_ubyte)),
    )
    output_blob = _DataBlob()
    crypt32 = ctypes.windll.crypt32
    kernel32 = ctypes.windll.kernel32

    if not crypt32.CryptProtectData(
        ctypes.byref(input_blob),
        ctypes.c_wchar_p(APP_NAME),
        None,
        None,
        None,
        CRYPTPROTECT_UI_FORBIDDEN,
        ctypes.byref(output_blob),
    ):
        raise RuntimeError("Windows DPAPI 無法加密 MT5 credential。")

    try:
        return ctypes.string_at(output_blob.pbData, output_blob.cbData)
    finally:
        kernel32.LocalFree(output_blob.pbData)


def _dpapi_unprotect(value: bytes) -> bytes:
    if os.name != "nt":
        raise RuntimeError("MT5 credential 安全保存僅支援 Windows DPAPI。")

    buffer = ctypes.create_string_buffer(value)
    input_blob = _DataBlob(
        len(value),
        ctypes.cast(buffer, ctypes.POINTER(ctypes.c_ubyte)),
    )
    output_blob = _DataBlob()
    crypt32 = ctypes.windll.crypt32
    kernel32 = ctypes.windll.kernel32

    if not crypt32.CryptUnprotectData(
        ctypes.byref(input_blob),
        None,
        None,
        None,
        None,
        CRYPTPROTECT_UI_FORBIDDEN,
        ctypes.byref(output_blob),
    ):
        raise RuntimeError("Windows DPAPI 無法解密 MT5 credential。")

    try:
        return ctypes.string_at(output_blob.pbData, output_blob.cbData)
    finally:
        kernel32.LocalFree(output_blob.pbData)


def _save_credential(account_id: str, password: str) -> None:
    payload = json.dumps(
        {"accountId": account_id, "password": password},
        ensure_ascii=False,
    ).encode("utf-8")
    encrypted = _dpapi_protect(payload)
    target = _credential_path(account_id)
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(".tmp")
    temporary.write_bytes(encrypted)
    os.replace(temporary, target)


def _load_credential(account_id: str) -> str | None:
    target = _credential_path(account_id)
    if not target.exists():
        return None

    try:
        payload = json.loads(_dpapi_unprotect(target.read_bytes()).decode("utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, RuntimeError):
        return None

    if payload.get("accountId") != account_id:
        return None
    password = payload.get("password")
    return password if isinstance(password, str) and password else None


def _credential_saved(account_id: str) -> bool:
    return _load_credential(account_id) is not None


def _delete_credential(account_id: str) -> None:
    target = _credential_path(account_id)
    try:
        target.unlink(missing_ok=True)
    except OSError as error:
        raise RuntimeError("無法移除 Windows 保存的 MT5 credential。") from error


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _iso_from_seconds(value: int | float | None) -> str | None:
    if not value:
        return None
    return datetime.fromtimestamp(float(value), tz=timezone.utc).isoformat()


def _read_since(value: str | None) -> datetime:
    if not value:
        return datetime(2000, 1, 1, tzinfo=timezone.utc)

    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        # Small overlap makes incremental sync resilient to clock boundaries.
        return parsed.astimezone(timezone.utc) - timedelta(minutes=10)
    except ValueError:
        return datetime(2000, 1, 1, tzinfo=timezone.utc)


def _last_error_message(prefix: str) -> str:
    code, message = mt5.last_error()
    return f"{prefix} ({code}: {message})"


def _connect(request: SyncRequest) -> None:
    if not mt5.initialize():
        raise RuntimeError(_last_error_message("無法連接 MetaTrader 5 Terminal"))

    try:
        login = int(request.login.strip())
    except ValueError as error:
        mt5.shutdown()
        raise RuntimeError("MT5 Login 必須是數字帳號。") from error

    current = mt5.account_info()
    current_login = int(getattr(current, "login", 0) or 0) if current else 0
    current_server = str(getattr(current, "server", "") or "").strip().lower() if current else ""
    requested_server = request.server.strip().lower()
    if current_login == login and (not current_server or current_server == requested_server):
        if request.rememberPassword and request.password:
            if not mt5.login(login, password=request.password, server=request.server.strip()):
                message = _last_error_message("MT5 登入失敗，請確認 Server、Login 與 Investor Password")
                mt5.shutdown()
                raise RuntimeError(message)
            _save_credential(request.accountId, request.password)
        return

    effective_password = request.password or _load_credential(request.accountId)
    if not effective_password:
        mt5.shutdown()
        raise RuntimeError(
            "MT5 Terminal 目前不是此帳戶，且 Windows 尚未保存 credential。請手動連接一次並勾選「Windows 安全記住 Read-only Password」。"
        )

    if not mt5.login(login, password=effective_password, server=request.server.strip()):
        message = _last_error_message("MT5 登入失敗，請確認 Server、Login 與 Investor Password")
        mt5.shutdown()
        raise RuntimeError(message)

    if request.rememberPassword and request.password:
        _save_credential(request.accountId, request.password)


def _number(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _ticket(value: Any) -> str | None:
    if value in (None, "", 0):
        return None
    return str(value)


def _position_identifier(position: Any) -> int:
    identifier = int(getattr(position, "identifier", 0) or 0)
    if identifier:
        return identifier
    return int(getattr(position, "ticket", 0) or 0)


def _is_market_deal(deal: Any) -> bool:
    return getattr(deal, "type", None) in (mt5.DEAL_TYPE_BUY, mt5.DEAL_TYPE_SELL)


def _deal_is_entry(deal: Any) -> bool:
    return getattr(deal, "entry", None) in (mt5.DEAL_ENTRY_IN, mt5.DEAL_ENTRY_INOUT)


def _deal_is_exit(deal: Any) -> bool:
    return getattr(deal, "entry", None) in (
        mt5.DEAL_ENTRY_OUT,
        mt5.DEAL_ENTRY_INOUT,
        mt5.DEAL_ENTRY_OUT_BY,
    )


def _weighted_price(deals: list[Any]) -> float:
    volume = sum(_number(getattr(deal, "volume", 0)) for deal in deals)
    if volume <= 0:
        return 0.0
    total = sum(
        _number(getattr(deal, "price", 0)) * _number(getattr(deal, "volume", 0))
        for deal in deals
    )
    return total / volume


def _history_for_position(position_id: int) -> list[Any]:
    deals = mt5.history_deals_get(position=position_id)
    if deals is None:
        return []
    return sorted(deals, key=lambda item: (getattr(item, "time_msc", 0), getattr(item, "ticket", 0)))


def _entry_sl_tp(position_id: int) -> tuple[float, float]:
    orders = mt5.history_orders_get(position=position_id)
    if not orders:
        return 0.0, 0.0

    ordered = sorted(orders, key=lambda item: (getattr(item, "time_setup_msc", 0), getattr(item, "ticket", 0)))
    for order in ordered:
        sl = _number(getattr(order, "sl", 0))
        tp = _number(getattr(order, "tp", 0))
        if sl > 0 or tp > 0:
            return sl, tp

    return 0.0, 0.0


def _normalize_position(
    login: str,
    position_id: int,
    current_position: Any | None,
) -> dict[str, Any] | None:
    deals = [deal for deal in _history_for_position(position_id) if _is_market_deal(deal)]
    entry_deals = [deal for deal in deals if _deal_is_entry(deal)]
    exit_deals = [deal for deal in deals if _deal_is_exit(deal)]

    if current_position is not None and not entry_deals:
        direction = "buy" if getattr(current_position, "type", None) == mt5.POSITION_TYPE_BUY else "sell"
        opened_at = _iso_from_seconds(getattr(current_position, "time", None)) or _utc_now().isoformat()
        return {
            "externalId": f"mt5:{login}:position:{position_id}",
            "dealId": None,
            "positionId": str(position_id),
            "orderId": None,
            "openedAt": opened_at,
            "closedAt": None,
            "symbol": str(getattr(current_position, "symbol", "")),
            "direction": direction,
            "positionStatus": "open",
            "entryPrice": _number(getattr(current_position, "price_open", 0)),
            "exitPrice": None,
            "stopLoss": _number(getattr(current_position, "sl", 0)) or None,
            "takeProfit": _number(getattr(current_position, "tp", 0)) or None,
            "lotSize": _number(getattr(current_position, "volume", 0)),
            "grossProfit": 0.0,
            "commission": 0.0,
            "swap": _number(getattr(current_position, "swap", 0)),
            "fee": 0.0,
        }

    if not entry_deals:
        return None

    first_entry = entry_deals[0]
    direction = "buy" if getattr(first_entry, "type", None) == mt5.DEAL_TYPE_BUY else "sell"
    is_open = current_position is not None
    sl, tp = _entry_sl_tp(position_id)

    if is_open:
        sl = _number(getattr(current_position, "sl", 0)) or sl
        tp = _number(getattr(current_position, "tp", 0)) or tp

    profit_deals = deals
    gross_profit = sum(_number(getattr(deal, "profit", 0)) for deal in profit_deals)
    commission = sum(_number(getattr(deal, "commission", 0)) for deal in profit_deals)
    swap = sum(_number(getattr(deal, "swap", 0)) for deal in profit_deals)
    fee = sum(_number(getattr(deal, "fee", 0)) for deal in profit_deals)

    exit_price = None if is_open or not exit_deals else _weighted_price(exit_deals)
    closed_at = None
    if not is_open and exit_deals:
        closed_at = _iso_from_seconds(getattr(exit_deals[-1], "time", None))

    return {
        "externalId": f"mt5:{login}:position:{position_id}",
        "dealId": _ticket(getattr(deals[-1], "ticket", None)) if deals else None,
        "positionId": str(position_id),
        "orderId": _ticket(getattr(first_entry, "order", None)),
        "openedAt": _iso_from_seconds(getattr(first_entry, "time", None)) or _utc_now().isoformat(),
        "closedAt": closed_at,
        "symbol": str(getattr(first_entry, "symbol", "")),
        "direction": direction,
        "positionStatus": "open" if is_open else "closed",
        "entryPrice": _weighted_price(entry_deals),
        "exitPrice": exit_price,
        "stopLoss": sl or None,
        "takeProfit": tp or None,
        "lotSize": sum(_number(getattr(deal, "volume", 0)) for deal in entry_deals),
        "grossProfit": gross_profit,
        "commission": commission,
        "swap": swap,
        "fee": fee,
    }


def _cashflow_type(deal: Any) -> str | None:
    deal_type = getattr(deal, "type", None)
    amount = _number(getattr(deal, "profit", 0))
    comment = str(getattr(deal, "comment", "") or "").lower()

    if deal_type == mt5.DEAL_TYPE_BALANCE:
        if amount >= 0:
            return "deposit"
        if "payout" in comment or "profit split" in comment:
            return "payout"
        return "withdrawal"

    if deal_type in (
        getattr(mt5, "DEAL_TYPE_CREDIT", -999),
        getattr(mt5, "DEAL_TYPE_CORRECTION", -998),
        getattr(mt5, "DEAL_TYPE_BONUS", -997),
    ):
        return "adjustment"

    return None


def _normalize_cashflows(deals: list[Any], synced_at: str) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for deal in deals:
        cashflow_type = _cashflow_type(deal)
        if not cashflow_type:
            continue

        ticket = _ticket(getattr(deal, "ticket", None)) or "unknown"
        items.append({
            "externalId": f"mt5:cashflow:{ticket}",
            "occurredAt": _iso_from_seconds(getattr(deal, "time", None)) or synced_at,
            "type": cashflow_type,
            "amount": _number(getattr(deal, "profit", 0)),
            "balanceAfter": None,
            "reference": ticket,
        })
    return items


def _detect_starting_balance(deals: list[Any]) -> float | None:
    balance_deals = sorted(
        (
            deal
            for deal in deals
            if getattr(deal, "type", None) == mt5.DEAL_TYPE_BALANCE
            and _number(getattr(deal, "profit", 0)) > 0
        ),
        key=lambda item: (getattr(item, "time_msc", 0), getattr(item, "ticket", 0)),
    )
    if not balance_deals:
        return None

    value = _number(getattr(balance_deals[0], "profit", 0))
    return value if value > 0 else None


def _sync(request: SyncRequest) -> dict[str, Any]:
    with SYNC_LOCK:
        _connect(request)
        try:
            info = mt5.account_info()
            if info is None:
                raise RuntimeError(_last_error_message("讀取 MT5 帳戶資訊失敗"))

            now = _utc_now()
            since = _read_since(request.since)
            recent_deals = mt5.history_deals_get(since, now)
            if recent_deals is None:
                raise RuntimeError(_last_error_message("讀取 MT5 歷史成交失敗"))

            positions = mt5.positions_get()
            if positions is None:
                raise RuntimeError(_last_error_message("讀取 MT5 持倉失敗"))

            current_by_id = {
                _position_identifier(position): position
                for position in positions
                if _position_identifier(position)
            }

            touched_ids = {
                int(getattr(deal, "position_id", 0) or 0)
                for deal in recent_deals
                if _is_market_deal(deal) and int(getattr(deal, "position_id", 0) or 0)
            }
            touched_ids.update(current_by_id.keys())

            normalized_trades: list[dict[str, Any]] = []
            for position_id in sorted(touched_ids):
                normalized = _normalize_position(
                    request.login.strip(),
                    position_id,
                    current_by_id.get(position_id),
                )
                if normalized:
                    normalized_trades.append(normalized)

            synced_at = now.isoformat()
            return {
                "schemaVersion": SCHEMA_VERSION,
                "provider": "mt5",
                "accountId": request.accountId,
                "brokerLogin": request.login.strip(),
                "brokerServer": request.server.strip(),
                "syncedAt": synced_at,
                "cursor": synced_at,
                "account": {
                    "startingBalance": _detect_starting_balance(list(recent_deals)),
                    "balance": _number(getattr(info, "balance", 0)),
                    "equity": _number(getattr(info, "equity", 0)),
                    "currency": str(getattr(info, "currency", "USD") or "USD"),
                },
                "trades": normalized_trades,
                "cashflows": _normalize_cashflows(list(recent_deals), synced_at),
            }
        finally:
            mt5.shutdown()


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": APP_NAME,
        "version": APP_VERSION,
        "mt5ModuleVersion": getattr(mt5, "__version__", None),
        "credentialProtection": "windows-dpapi" if os.name == "nt" else "unavailable",
    }


@app.get("/credentials/{account_id}")
def credential_status(account_id: str) -> dict[str, bool]:
    return {"saved": _credential_saved(account_id)}


@app.delete("/credentials/{account_id}")
def forget_credential(account_id: str) -> dict[str, bool]:
    try:
        _delete_credential(account_id)
        return {"saved": False}
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.post("/sync")
def sync(request: SyncRequest) -> dict[str, Any]:
    try:
        return _sync(request)
    except RuntimeError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    except Exception as error:
        # Do not include request data or credentials in the error response/log.
        raise HTTPException(status_code=500, detail=f"MT5 同步失敗：{type(error).__name__}") from error
