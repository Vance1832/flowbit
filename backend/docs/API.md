# Flowbit Backend API

Base URL examples:

- Local Django: `http://127.0.0.1:8000`
- All API routes are prefixed with `/api/`

Authentication:

- Auth uses JWT.
- Send `Authorization: Bearer <access_token>` for protected routes.
- Refresh expired access tokens with `/api/auth/refresh/`.

Roles:

- `public`: no auth required
- `user`: authenticated normal user or `vip_user`
- `staff+`: `staff`, `admin`, or `owner`
- `admin+`: `admin` or `owner`
- `owner`: owner only

Pagination:

- List endpoints use page-number pagination.
- Default page size: `20`
- Query params:
  - `?page=2`

Paginated response shape:

```json
{
  "count": 42,
  "next": "http://127.0.0.1:8000/api/wallets/transactions/?page=2",
  "previous": null,
  "results": []
}
```

Error format:

```json
{
  "detail": "Human-readable error message."
}
```

Validation errors:

```json
{
  "amount": ["Minimum withdrawal amount is 10000."]
}
```

## Auth Endpoints

### Login

- Method: `POST`
- URL: `/api/auth/login/`
- Role: `public`

Request body:

```json
{
  "phone": "+959777777777",
  "password": "testpassword123"
}
```

Response:

```json
{
  "refresh": "refresh-token",
  "access": "access-token",
  "user": {
    "id": 7,
    "name": "Flow Test User",
    "phone": "+959777777777",
    "role": "user",
    "status": "active"
  }
}
```

### Refresh Token

- Method: `POST`
- URL: `/api/auth/refresh/`
- Role: `public`

Request body:

```json
{
  "refresh": "refresh-token"
}
```

Response:

```json
{
  "access": "new-access-token"
}
```

## Accounts Endpoints

### Register

- Method: `POST`
- URL: `/api/accounts/register/`
- Role: `public`

Request body:

```json
{
  "name": "Flow Test User",
  "phone_country_code": "+95",
  "phone_number": "9777777777",
  "email": "flowtest@example.com",
  "password": "testpassword123",
  "confirm_password": "testpassword123"
}
```

Response:

```json
{
  "id": 7,
  "name": "Flow Test User",
  "phone_country_code": "+95",
  "phone_number": "9777777777",
  "phone": "+959777777777",
  "email": "flowtest@example.com"
}
```

### My Profile

- Method: `GET`
- URL: `/api/accounts/me/`
- Role: `user`

Request body: none

Response:

```json
{
  "id": 7,
  "name": "Flow Test User",
  "phone_country_code": "+95",
  "phone_number": "9777777777",
  "phone": "+959777777777",
  "email": "flowtest@example.com",
  "role": "user",
  "status": "active",
  "phone_verified": false,
  "email_verified": false
}
```

## Wallet Endpoints

### My Wallet

- Method: `GET`
- URL: `/api/wallets/me/`
- Role: `user`

Request body: none

Response:

```json
{
  "id": 3,
  "balance": "2144000.00",
  "locked_balance": "0.00",
  "created_at": "2026-05-20T01:00:00Z",
  "updated_at": "2026-05-20T01:10:00Z"
}
```

### My Wallet Transactions

- Method: `GET`
- URL: `/api/wallets/transactions/`
- Role: `user`

Request body: none

Response:

```json
{
  "count": 3,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 15,
      "transaction_type": "settlement_credit",
      "amount": "2100000.00",
      "balance_before": "44000.00",
      "balance_after": "2144000.00",
      "reference_table": "settlement_items",
      "reference_id": 8,
      "description": "Settlement credit for TEST02",
      "created_at": "2026-05-20T01:10:00Z"
    }
  ]
}
```

### Deposit Requests

- Method: `GET`
- URL: `/api/wallets/deposits/`
- Role: `user`

Request body: none

Response:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 11,
      "amount": "50000.00",
      "payment_method": "KBZPay",
      "sender_account_name": "Flow Test User",
      "transaction_reference": "DEP-001",
      "proof_image_url": null,
      "user_note": "Please approve",
      "staff_note": "Approved by test_full_flow",
      "status": "approved",
      "assigned_to": null,
      "assigned_at": null,
      "reviewed_by": 1,
      "reviewed_at": "2026-05-20T01:02:00Z",
      "created_at": "2026-05-20T01:01:00Z",
      "updated_at": "2026-05-20T01:02:00Z"
    }
  ]
}
```

### Create Deposit Request

- Method: `POST`
- URL: `/api/wallets/deposits/`
- Role: `user`

Request body:

```json
{
  "amount": "50000.00",
  "payment_method": "KBZPay",
  "sender_account_name": "Flow Test User",
  "transaction_reference": "DEP-001",
  "proof_image_url": "https://example.com/proof.jpg",
  "user_note": "Please approve"
}
```

Response:

```json
{
  "id": 11,
  "amount": "50000.00",
  "payment_method": "KBZPay",
  "sender_account_name": "Flow Test User",
  "transaction_reference": "DEP-001",
  "proof_image_url": "https://example.com/proof.jpg",
  "user_note": "Please approve",
  "staff_note": null,
  "status": "pending",
  "assigned_to": null,
  "assigned_at": null,
  "reviewed_by": null,
  "reviewed_at": null,
  "created_at": "2026-05-20T01:01:00Z",
  "updated_at": "2026-05-20T01:01:00Z"
}
```

### Withdrawal Requests

- Method: `GET`
- URL: `/api/wallets/withdrawals/`
- Role: `user`

Request body: none

Response:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 4,
      "amount": "10000.00",
      "payment_account_name": "Flow Test User",
      "payment_account_number": "123456789",
      "payment_method": "KBZPay",
      "user_note": "Withdraw please",
      "staff_note": null,
      "status": "pending",
      "reviewed_by": null,
      "reviewed_at": null,
      "paid_by": null,
      "paid_at": null,
      "created_at": "2026-05-20T01:01:00Z",
      "updated_at": "2026-05-20T01:01:00Z"
    }
  ]
}
```

### Create Withdrawal Request

- Method: `POST`
- URL: `/api/wallets/withdrawals/`
- Role: `user`

Request body:

```json
{
  "amount": "10000.00",
  "payment_account_name": "Flow Test User",
  "payment_account_number": "123456789",
  "payment_method": "KBZPay",
  "user_note": "Withdraw please"
}
```

Response:

```json
{
  "id": 4,
  "amount": "10000.00",
  "payment_account_name": "Flow Test User",
  "payment_account_number": "123456789",
  "payment_method": "KBZPay",
  "user_note": "Withdraw please",
  "staff_note": null,
  "status": "pending",
  "reviewed_by": null,
  "reviewed_at": null,
  "paid_by": null,
  "paid_at": null,
  "created_at": "2026-05-20T01:01:00Z",
  "updated_at": "2026-05-20T01:01:00Z"
}
```

### Admin Deposit Request List

- Method: `GET`
- URL: `/api/wallets/admin/deposits/`
- Role: `staff+`

Request body: none

Response:

```json
{
  "count": 12,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 11,
      "amount": "50000.00",
      "payment_method": "KBZPay",
      "sender_account_name": "Flow Test User",
      "transaction_reference": "DEP-001",
      "proof_image_url": null,
      "user_note": "Please approve",
      "staff_note": null,
      "status": "pending",
      "assigned_to": null,
      "assigned_at": null,
      "reviewed_by": null,
      "reviewed_at": null,
      "created_at": "2026-05-20T01:01:00Z",
      "updated_at": "2026-05-20T01:01:00Z"
    }
  ]
}
```

### Assign Deposit Request

- Method: `POST`
- URL: `/api/wallets/admin/deposits/{id}/assign/`
- Role: `staff+`

Request body:

```json
{}
```

Response:

```json
{
  "id": 11,
  "status": "in_review",
  "assigned_to": 2,
  "assigned_at": "2026-05-20T01:02:00Z"
}
```

### Approve Deposit Request

- Method: `POST`
- URL: `/api/wallets/admin/deposits/{id}/approve/`
- Role: `staff+`

Request body:

```json
{
  "staff_note": "Payment confirmed."
}
```

Response:

```json
{
  "id": 11,
  "status": "approved",
  "staff_note": "Payment confirmed.",
  "reviewed_by": 2,
  "reviewed_at": "2026-05-20T01:03:00Z"
}
```

### Reject Deposit Request

- Method: `POST`
- URL: `/api/wallets/admin/deposits/{id}/reject/`
- Role: `staff+`

Request body:

```json
{
  "staff_note": "Reference number invalid."
}
```

Response:

```json
{
  "id": 11,
  "status": "rejected",
  "staff_note": "Reference number invalid."
}
```

### Admin Withdrawal Request List

- Method: `GET`
- URL: `/api/wallets/admin/withdrawals/`
- Role: `staff+`

Request body: none

Response:

```json
{
  "count": 8,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 4,
      "amount": "10000.00",
      "payment_account_name": "Flow Test User",
      "payment_account_number": "123456789",
      "payment_method": "KBZPay",
      "user_note": "Withdraw please",
      "staff_note": null,
      "status": "pending",
      "reviewed_by": null,
      "reviewed_at": null,
      "paid_by": null,
      "paid_at": null,
      "created_at": "2026-05-20T01:01:00Z",
      "updated_at": "2026-05-20T01:01:00Z"
    }
  ]
}
```

### Approve Withdrawal Request

- Method: `POST`
- URL: `/api/wallets/admin/withdrawals/{id}/approve/`
- Role: `staff+`

Request body:

```json
{
  "staff_note": "Approved for payout."
}
```

Response:

```json
{
  "id": 4,
  "status": "approved",
  "staff_note": "Approved for payout."
}
```

### Reject Withdrawal Request

- Method: `POST`
- URL: `/api/wallets/admin/withdrawals/{id}/reject/`
- Role: `staff+`

Request body:

```json
{
  "staff_note": "Insufficient documentation."
}
```

Response:

```json
{
  "id": 4,
  "status": "rejected",
  "staff_note": "Insufficient documentation."
}
```

### Mark Withdrawal Paid

- Method: `POST`
- URL: `/api/wallets/admin/withdrawals/{id}/mark-paid/`
- Role: `staff+`

Request body:

```json
{
  "staff_note": "Transfer completed."
}
```

Response:

```json
{
  "id": 4,
  "status": "paid",
  "paid_by": 2,
  "paid_at": "2026-05-20T01:05:00Z"
}
```

## Receipt Endpoints

### My Receipts

- Method: `GET`
- URL: `/api/receipts/`
- Role: `user`

Request body: none

Response:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 5,
      "receipt_no": "FB-TEST02-000001",
      "result_period": 3,
      "total_amount": "6000.00",
      "status": "paid",
      "paid_at": "2026-05-20T01:04:00Z",
      "created_at": "2026-05-20T01:04:00Z",
      "items": [
        {
          "id": 21,
          "number_code": "124",
          "amount": "3000.00",
          "is_generated_by_r": false,
          "source_input": null,
          "created_at": "2026-05-20T01:04:00Z"
        }
      ]
    }
  ]
}
```

### My Receipt Detail

- Method: `GET`
- URL: `/api/receipts/{id}/`
- Role: `user`

Request body: none

Response:

```json
{
  "id": 5,
  "receipt_no": "FB-TEST02-000001",
  "result_period": 3,
  "total_amount": "6000.00",
  "status": "paid",
  "paid_at": "2026-05-20T01:04:00Z",
  "created_at": "2026-05-20T01:04:00Z",
  "items": [
    {
      "id": 21,
      "number_code": "124",
      "amount": "3000.00",
      "is_generated_by_r": false,
      "source_input": null,
      "created_at": "2026-05-20T01:04:00Z"
    }
  ]
}
```

### Submit Paid Numbers

- Method: `POST`
- URL: `/api/receipts/submit/`
- Role: `user`

Request body:

```json
{
  "result_period_code": "TEST02",
  "items": [
    {
      "number_code": "124",
      "amount": "3000"
    },
    {
      "number_code": "112",
      "amount": "1000",
      "use_r": true
    }
  ]
}
```

Response:

```json
{
  "id": 5,
  "receipt_no": "FB-TEST02-000001",
  "result_period": 3,
  "total_amount": "6000.00",
  "status": "paid",
  "paid_at": "2026-05-20T01:04:00Z",
  "created_at": "2026-05-20T01:04:00Z",
  "items": [
    {
      "id": 21,
      "number_code": "124",
      "amount": "3000.00",
      "is_generated_by_r": false,
      "source_input": null,
      "created_at": "2026-05-20T01:04:00Z"
    },
    {
      "id": 22,
      "number_code": "112",
      "amount": "1000.00",
      "is_generated_by_r": true,
      "source_input": "112 R",
      "created_at": "2026-05-20T01:04:00Z"
    }
  ]
}
```

## Result Endpoints

### Public/Past Result List for Logged-in Users

- Method: `GET`
- URL: `/api/ledgers/results/`
- Role: `user`

Request body: none

Response:

```json
[
  {
    "result_date": "2026-06-30",
    "result_number": "124",
    "status": "Matched - Confirmed and Paid Out"
  }
]
```

## Admin Ledger Endpoints

### Result Period List

- Method: `GET`
- URL: `/api/ledgers/admin/result-periods/`
- Role: `admin+`

Request body: none

Response:

```json
{
  "count": 3,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 3,
      "code": "TEST02",
      "name": "Test Period 02",
      "result_date": "2026-06-30",
      "default_close_time": "15:00:00",
      "result_number": null,
      "result_source": "manual",
      "is_visible_to_users": true,
      "status": "open",
      "result_entered_by": null,
      "result_entered_at": null,
      "result_voided_by": null,
      "result_voided_at": null,
      "result_void_reason": null,
      "created_by": 1,
      "created_at": "2026-05-20T01:00:00Z",
      "updated_at": "2026-05-20T01:00:00Z"
    }
  ]
}
```

### Create Result Period

- Method: `POST`
- URL: `/api/ledgers/admin/result-periods/`
- Role: `admin+`

Request body:

```json
{
  "code": "JUL01",
  "name": "July 01 Period",
  "result_date": "2026-07-01",
  "default_close_time": "15:00:00",
  "result_source": "manual",
  "is_visible_to_users": true,
  "status": "open"
}
```

Response:

```json
{
  "id": 8,
  "code": "JUL01",
  "name": "July 01 Period",
  "result_date": "2026-07-01",
  "default_close_time": "15:00:00",
  "result_number": null,
  "result_source": "manual",
  "is_visible_to_users": true,
  "status": "open",
  "created_by": 1
}
```

### Result Period Detail / Update

- Method: `GET`, `PUT`, `PATCH`
- URL: `/api/ledgers/admin/result-periods/{id}/`
- Role: `admin+`

Request body example for `PATCH`:

```json
{
  "is_visible_to_users": false
}
```

Response:

```json
{
  "id": 3,
  "code": "TEST02",
  "name": "Test Period 02",
  "is_visible_to_users": false
}
```

### Close Result Period

- Method: `POST`
- URL: `/api/ledgers/admin/result-periods/{id}/close/`
- Role: `admin+`

Request body:

```json
{}
```

Response:

```json
{
  "id": 3,
  "code": "TEST02",
  "status": "closed"
}
```

### Enter Result and Create Settlement Preview

- Method: `POST`
- URL: `/api/ledgers/admin/result-periods/{id}/enter-result/`
- Role: `admin+`

Request body:

```json
{
  "result_number": "124"
}
```

Response:

```json
{
  "detail": "Result entered and settlement preview created.",
  "settlement_batch_id": 9,
  "result_period": "TEST02",
  "result_number": "124",
  "status": "previewed",
  "total_collected": "6000.00",
  "total_settlement": "2100000.00",
  "reserve_required": "2094000.00",
  "profit_loss": "-2094000.00"
}
```

### Ledger List

- Method: `GET`
- URL: `/api/ledgers/admin/ledgers/`
- Role: `admin+`

Request body: none

Response:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 5,
      "result_period": 3,
      "name": "Test Ledger 02",
      "capacity_per_number": "800000.00",
      "settlement_rate": "700.00",
      "priority_order": 1,
      "open_at": "2026-06-30T00:00:00Z",
      "close_at": "2026-06-30T15:00:00Z",
      "status": "open",
      "created_by": 1
    }
  ]
}
```

### Create Ledger

- Method: `POST`
- URL: `/api/ledgers/admin/ledgers/`
- Role: `admin+`

Request body:

```json
{
  "result_period": 3,
  "name": "Main Ledger",
  "capacity_per_number": "800000",
  "settlement_rate": "700",
  "priority_order": 1,
  "open_at": "2026-06-30T00:00:00Z",
  "close_at": "2026-06-30T15:00:00Z",
  "status": "open"
}
```

Response:

```json
{
  "id": 5,
  "result_period": 3,
  "name": "Main Ledger",
  "capacity_per_number": "800000.00",
  "settlement_rate": "700.00",
  "priority_order": 1,
  "status": "open",
  "created_by": 1
}
```

### Ledger Detail / Update

- Method: `GET`, `PUT`, `PATCH`
- URL: `/api/ledgers/admin/ledgers/{id}/`
- Role: `admin+`

Request body example for `PATCH`:

```json
{
  "status": "closed"
}
```

Response:

```json
{
  "id": 5,
  "name": "Test Ledger 02",
  "status": "closed"
}
```

### Ledger Numbers

- Method: `GET`
- URL: `/api/ledgers/admin/ledgers/{ledger_id}/numbers/`
- Role: `admin+`

Request body: none

Response:

```json
{
  "count": 1000,
  "next": "http://127.0.0.1:8000/api/ledgers/admin/ledgers/5/numbers/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1001,
      "ledger": 5,
      "number_code": "000",
      "max_capacity": "800000.00",
      "used_amount": "0.00",
      "remaining_amount": "800000.00",
      "updated_at": "2026-05-20T01:00:00Z"
    }
  ]
}
```

## Settlement Endpoints

### Settlement Batch List

- Method: `GET`
- URL: `/api/settlements/admin/batches/`
- Role: `admin+`

Request body: none

Response:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 9,
      "result_period": 3,
      "result_number": "124",
      "total_collected": "6000.00",
      "total_settlement": "2100000.00",
      "company_reserve_required": "2094000.00",
      "company_reserve_used": "2094000.00",
      "final_profit_loss": "-2094000.00",
      "status": "paid",
      "items": []
    }
  ]
}
```

### Settlement Batch Detail

- Method: `GET`
- URL: `/api/settlements/admin/batches/{id}/`
- Role: `admin+`

Request body: none

Response:

```json
{
  "id": 9,
  "result_period": 3,
  "result_number": "124",
  "total_collected": "6000.00",
  "total_settlement": "2100000.00",
  "company_reserve_required": "2094000.00",
  "company_reserve_used": "2094000.00",
  "final_profit_loss": "-2094000.00",
  "status": "paid",
  "items": [
    {
      "id": 8,
      "user": 7,
      "number_code": "124",
      "total_matched_amount": "3000.00",
      "settlement_rate": "700.00",
      "settlement_amount": "2100000.00",
      "status": "paid",
      "sources": []
    }
  ]
}
```

### Approve Settlement

- Method: `POST`
- URL: `/api/settlements/admin/batches/{id}/approve/`
- Role: `owner`

Request body:

```json
{}
```

Response:

```json
{
  "id": 9,
  "status": "paid",
  "company_reserve_used": "2094000.00",
  "approved_by": 1,
  "approved_at": "2026-05-20T01:10:00Z",
  "paid_at": "2026-05-20T01:10:00Z"
}
```

## Company Endpoints

### Company Wallet List

- Method: `GET`
- URL: `/api/company/admin/wallets/`
- Role: `admin+`

Request body: none

Response:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Main Company Reserve",
      "balance": "0.00",
      "created_at": "2026-05-20T01:00:00Z",
      "updated_at": "2026-05-20T01:10:00Z"
    }
  ]
}
```

### Add Company Reserve

- Method: `POST`
- URL: `/api/company/admin/wallets/{id}/add-reserve/`
- Role: `admin+`

Request body:

```json
{
  "amount": "2094000.00",
  "description": "Settlement reserve top-up"
}
```

Response:

```json
{
  "id": 1,
  "name": "Main Company Reserve",
  "balance": "2094000.00",
  "created_at": "2026-05-20T01:00:00Z",
  "updated_at": "2026-05-20T01:09:00Z"
}
```

### Company Wallet Transactions

- Method: `GET`
- URL: `/api/company/admin/transactions/`
- Role: `admin+`

Request body: none

Response:

```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 4,
      "company_wallet": 1,
      "transaction_type": "settlement_funding",
      "amount": "2094000.00",
      "balance_before": "2094000.00",
      "balance_after": "0.00",
      "reference_table": "settlement_batches",
      "reference_id": 9,
      "description": "Settlement funding for TEST02",
      "created_by": 1,
      "created_at": "2026-05-20T01:10:00Z"
    }
  ]
}
```

### Company Cashout List

- Method: `GET`
- URL: `/api/company/admin/cashouts/`
- Role: `admin+`

Request body: none

Response:

```json
{
  "count": 0,
  "next": null,
  "previous": null,
  "results": []
}
```

### Create Company Cashout Request

- Method: `POST`
- URL: `/api/company/admin/cashouts/`
- Role: `admin+`

Request body:

```json
{
  "amount": "500000.00",
  "reason": "Owner profit withdrawal"
}
```

Response:

```json
{
  "id": 3,
  "company_wallet": 1,
  "requested_by": 1,
  "approved_by": null,
  "amount": "500000.00",
  "status": "pending",
  "reason": "Owner profit withdrawal",
  "admin_note": null,
  "approved_at": null,
  "paid_at": null,
  "created_at": "2026-05-20T01:20:00Z",
  "updated_at": "2026-05-20T01:20:00Z"
}
```

### Approve Company Cashout

- Method: `POST`
- URL: `/api/company/admin/cashouts/{id}/approve/`
- Role: `owner`

Request body:

```json
{
  "admin_note": "Approved by owner."
}
```

Response:

```json
{
  "id": 3,
  "status": "approved",
  "approved_by": 1,
  "approved_at": "2026-05-20T01:21:00Z",
  "admin_note": "Approved by owner."
}
```

### Mark Company Cashout Paid

- Method: `POST`
- URL: `/api/company/admin/cashouts/{id}/mark-paid/`
- Role: `owner`

Request body:

```json
{
  "admin_note": "Transfer completed."
}
```

Response:

```json
{
  "id": 3,
  "status": "paid",
  "paid_at": "2026-05-20T01:22:00Z",
  "admin_note": "Transfer completed."
}
```

## Notification Endpoints

### My Notifications

- Method: `GET`
- URL: `/api/notifications/`
- Role: `user`

Request body: none

Response:

```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 13,
      "notification_type": "settlement",
      "title": "Settlement Credited",
      "message": "Your settlement of 2100000.00 for TEST02 has been credited.",
      "is_read": false,
      "reference_table": "settlement_items",
      "reference_id": 8,
      "created_at": "2026-05-20T01:10:00Z",
      "read_at": null
    }
  ]
}
```

### Mark Notification Read

- Method: `POST`
- URL: `/api/notifications/{id}/read/`
- Role: `user`

Request body:

```json
{}
```

Response:

```json
{
  "id": 13,
  "notification_type": "settlement",
  "title": "Settlement Credited",
  "message": "Your settlement of 2100000.00 for TEST02 has been credited.",
  "is_read": true,
  "reference_table": "settlement_items",
  "reference_id": 8,
  "created_at": "2026-05-20T01:10:00Z",
  "read_at": "2026-05-20T01:15:00Z"
}
```

### Mark All Notifications Read

- Method: `POST`
- URL: `/api/notifications/read-all/`
- Role: `user`

Request body:

```json
{}
```

Response:

```json
{
  "detail": "All notifications marked as read."
}
```
