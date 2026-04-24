# Stripe API Documentation

## Overview
This document provides a comprehensive guide for integrating Stripe's payment capabilities, specifically focusing on listing and managing payments. Designed for developers implementing Stripe into their applications, it covers authentication, core endpoints, request/response formats, and best practices.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Core Endpoints](#core-endpoints)
4. [Listing Payments](#listing-payments)
5. [Payment Object Structure](#payment-object-structure)
6. [Error Handling](#error-handling)
7. [Security Best Practices](#security-best-practices)
8. [Rate Limits & Pagination](#rate-limits--pagination)
9. [Testing & Webhooks](#testing--webhooks)
10. [Quick Reference](#quick-reference)

## Getting Started
### Prerequisites
- A Stripe account (sign up at [stripe.com](https://stripe.com))
- API keys (available in the Stripe Dashboard → Developers → API keys)
- `stripe` npm package installed: `npm install stripe`

### Initial Setup
```javascript
const stripe = require('stripe')('sk_test_your_secret_key');
```

## Authentication
Stripe uses API key authentication via the `Authorization` header.

### Types of Keys
| Key Type | Prefix | Usage | Security |
|----------|--------|-------|----------|
| Secret Key | `sk_live_` / `sk_test_` | Server-side requests | Keep secret |
| Publishable Key | `pk_live_` / `pk_test_` | Client-side (Stripe.js) | Safe to expose |
| Restricted Key | Custom scopes | Limited permissions | Use for specific tasks |

**Important**: Never expose secret keys in client-side code.

## Core Endpoints
### Base URL
```
https://api.stripe.com/v1
```

### Common Headers
```
Authorization: Bearer sk_test_xxx
Content-Type: application/x-www-form-urlencoded
Stripe-Version: 2023-10-16 (optional)
```

## Listing Payments
Retrieve a list of payments (Charges or PaymentIntents) with filtering and pagination.

### List PaymentIntents (Recommended)
```http
GET /v1/payment_intents
```

#### Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Max items per page (default: 10, max: 100) |
| `starting_after` | string | Cursor for pagination |
| `ending_before` | string | Cursor for pagination |
| `customer` | string | Filter by customer ID |
| `created` | timestamp | Filter by creation date |
| `status` | string | Filter by status (e.g., `succeeded`, `requires_payment_method`) |

#### Example Request
```bash
curl https://api.stripe.com/v1/payment_intents \
  -u sk_test_xxx: \
  -G -d limit=10 \
  -d status=succeeded
```

#### Example Response
```json
{
  "object": "list",
  "url": "/v1/payment_intents",
  "has_more": true,
  "data": [
    {
      "id": "pi_123456789",
      "object": "payment_intent",
      "amount": 2000,
      "currency": "usd",
      "status": "succeeded",
      "created": 1698765432,
      "customer": "cus_123456",
      "description": "Payment for order #12345"
    }
  ]
}
```

### List Charges (Legacy)
```http
GET /v1/charges
```
*Note: PaymentIntents is the modern approach; use Charges only for legacy integrations.*

## Payment Object Structure
### Common Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `object` | string | Type of object (`payment_intent`, `charge`) |
| `amount` | integer | Amount in cents (e.g., 2000 = $20.00) |
| `currency` | string | ISO currency code (e.g., `usd`, `eur`) |
| `status` | string | Current status |
| `created` | integer | Unix timestamp |
| `customer` | string | Customer ID if associated |
| `description` | string | Optional description |
| `metadata` | object | Key-value pairs for custom data |

### PaymentIntent Status Flow
```
requires_payment_method → requires_confirmation → requires_action → succeeded
                                    ↓
                                 canceled
```

## Error Handling
### HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (invalid parameters) |
| 401 | Unauthorized (invalid API key) |
| 402 | Payment Required (payment failed) |
| 404 | Not Found (invalid resource) |
| 429 | Too Many Requests (rate limit) |

### Error Response Format
```json
{
  "error": {
    "type": "invalid_request_error",
    "message": "Missing required parameter: amount",
    "param": "amount"
  }
}
```

### Example Error Handling (Node.js)
```javascript
try {
  const paymentIntents = await stripe.paymentIntents.list({ limit: 10 });
} catch (error) {
  console.error('Stripe Error:', error.type, error.message);
  // Handle specific error types
  if (error.type === 'StripeCardError') {
    // Card was declined
  }
}
```

## Security Best Practices
1. **Never** expose secret keys in client-side code
2. Use restricted API keys when possible
3. Validate webhook signatures to ensure authenticity
4. Implement idempotency keys for critical operations
5. Use HTTPS for all requests
6. Rotate compromised keys immediately

## Rate Limits & Pagination
- Default limit: **100 requests per second** per account
- Use `limit` parameter to control page size (max 100)
- Use `has_more` and `ending_before`/`starting_after` for pagination
- Monitor rate limits via response headers:
  - `Request-Id`: Unique request identifier
  - `Retry-After`: Seconds to wait after rate limit

## Testing & Webhooks
### Test Cards
Use these test card numbers for development:
- `4242 4242 4242 4242` → Success
- `4000 0000 0000 9995` → Insufficient funds
- `4000 0000 0000 0341` → Processing error

### Webhook Verification
Always verify webhook signatures:
```javascript
const event = stripe.webhooks.constructEvent(
  payload,
  sig,
  webhookSecret
);
```

## Quick Reference
### List Recent Payments
```javascript
const payments = await stripe.paymentIntents.list({
  limit: 10,
  status: 'succeeded'
});
```

### Filter by Customer
```javascript
const customerPayments = await stripe.paymentIntents.list({
  customer: 'cus_123456',
  limit: 20
});
```

### Get Single Payment
```javascript
const payment = await stripe.paymentIntents.retrieve('pi_123456789');
```

---
**Last Updated**: 2024
**Stripe API Version**: Latest
**Documentation**: https://stripe.com/docs/api