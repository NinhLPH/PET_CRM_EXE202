---
title: "TailUp CRM API v1 for Frontend"
source: "API_DOC.docx"
document_type: "API Integration Reference"
endpoint_count: 45
language: "vi"
---

# TailUp CRM API v1 cho Frontend

> Tài liệu Markdown này được tái cấu trúc từ `API_DOC.docx` để AI Agent và Frontend Developer dễ tra cứu.
> Nội dung giữ nguyên các quy tắc, endpoint, request/response và ví dụ có trong tài liệu gốc.

## 1. Tổng quan

- Backend hiện có **45 endpoint**.
- Endpoint path được ghép trực tiếp với **API origin**.
- **Không có tiền tố `/api/v1`**.
- Swagger UI: `/openapi` khi server đang chạy.
- Body ghi dữ liệu dùng JSON với header:

```http
Content-Type: application/json
```

---

## 2. Quy ước tích hợp quan trọng

### 2.1. Authentication và cookie

Các route dành cho `CUSTOMER` và `ADMIN` dùng cookie:

```text
petcare_session
```

Nếu Frontend chạy khác origin:

```js
credentials: "include"
```

Backend phải cấu hình origin tương ứng trong:

```text
CORS_ORIGINS
```

Cookie là `HttpOnly`, vì vậy JavaScript phía Frontend **không được đọc trực tiếp cookie này**.

### 2.2. Kiểu dữ liệu

| Dữ liệu | Quy ước |
|---|---|
| BIGINT / ID | Chuỗi số trong request và response |
| Tiền | Số nguyên VND |
| Cân nặng | Chuỗi thập phân, tối đa 2 chữ số lẻ |
| DateTime response | ISO 8601 UTC |
| Query `date` và ngày reminder | Xét theo `Asia/Ho_Chi_Minh` |

### 2.3. Pagination

Các endpoint GET dạng danh sách có thể dùng:

```text
page
limit
```

Mặc định:

```text
page = 1
limit = 20
```

Giới hạn:

```text
limit <= 100
```

Các path parameter như `{id}`, `{petId}`, `{priceId}` là **ID chuỗi số dương**.

### 2.4. HTTP status theo cấu hình hiện tại

| Operation | Status thường dùng |
|---|---:|
| POST | `201` |
| GET | `200` |
| PATCH | `200` |
| PUT | `200` |
| DELETE | `200` |

---

## 3. Quy tắc đặt lịch bắt buộc

Flow đặt lịch phía Frontend:

```text
1. GET /services/{id}/quote
2. Lấy basePrice từ quote
3. POST /bookings
4. Gửi basePrice vào expectedBasePrice
5. Gửi một Idempotency-Key duy nhất cho thao tác
```

Nếu backend trả:

```json
{
  "code": "PRICE_CHANGED",
  "message": "Giá đã thay đổi",
  "currentQuote": {
    "basePrice": 250000,
    "servicePriceId": "7"
  }
}
```

Frontend cần:

```text
Hiển thị giá mới -> yêu cầu người dùng xác nhận lại -> gửi booking lại nếu người dùng đồng ý
```

---

## 4. Error format

### 4.1. Lỗi chung

```json
{
  "code": "HTTP_400",
  "message": "..."
}
```

### 4.2. Validation error

```json
{
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "...",
      "messages": ["..."]
    }
  ]
}
```

### 4.3. Ý nghĩa HTTP status

| Status | Ý nghĩa |
|---:|---|
| `401` | Thiếu phiên hoặc phiên đã hết hạn |
| `403` | Sai vai trò, quyền sở hữu hoặc Origin |
| `404` | Không tìm thấy dữ liệu |
| `409` | Trùng dữ liệu, thay đổi giá hoặc xung đột trạng thái |
| `429` | Quá nhiều lần đăng nhập/đăng ký |

---

# 5. Request Body Schemas

## 5.1. `Register`

```ts
{
  fullName: string;        // 1..100 ký tự
  phone: string;           // 10 chữ số, bắt đầu bằng 0
  password: string;        // >= 8 ký tự
  confirmPassword: string; // phải giống password
}
```

## 5.2. `Login`

```ts
{
  phone: string;    // 10 chữ số, bắt đầu bằng 0
  password: string;
}
```

## 5.3. `ProfilePatch`

```ts
{
  fullName?: string; // 1..100 ký tự
  address?: string;  // <= 255 ký tự
}
```

Không gửi `phone`.

## 5.4. `PetCreate`

```ts
{
  name: string;            // 1..100
  species: "DOG" | "CAT";
  weight: string;          // > 0 đến 999.99, tối đa 2 số lẻ
  breed?: string;          // <= 100
  allergyNote?: string;
  specialNote?: string;
}
```

## 5.5. `PetPatch`

Tất cả trường của `PetCreate` đều tùy chọn.

Nếu gửi `weight`, giá trị vẫn phải hợp lệ.

## 5.6. `CustomerCreate`

```ts
{
  fullName: string; // 1..100
  phone: string;    // 10 chữ số, bắt đầu bằng 0
  address?: string; // <= 255
  note?: string;
}
```

## 5.7. `CustomerPatch`

Tất cả trường của `CustomerCreate` đều tùy chọn.

Quy tắc:

- Số điện thoại không được trùng.
- Không được đổi số điện thoại khi hồ sơ đã gắn tài khoản.

## 5.8. `ServiceCreate`

```ts
{
  serviceName: string;         // 1..100
  description?: string;
  estimatedDuration?: number;  // integer >= 1, đơn vị phút
}
```

## 5.9. `ServicePatch`

Tất cả trường của `ServiceCreate` đều tùy chọn.

## 5.10. `StatusBody`

```ts
{
  status: "ACTIVE" | "INACTIVE";
}
```

## 5.11. `PriceBody`

```ts
{
  species: "DOG" | "CAT";
  minWeight: string; // >= 0
  maxWeight?: string; // > minWeight; bỏ qua = không giới hạn
  price: number; // integer VND, 1..9_999_999_999
}
```

## 5.12. `BookingCreate`

```ts
{
  petId: string;
  serviceId: string;
  bookingDate: string;       // ISO 8601 có múi giờ, phải ở tương lai
  expectedBasePrice: number; // integer VND, 1..9_999_999_999
  note?: string;
}
```

## 5.13. `CancelBody`

```ts
{
  reason?: string; // <= 255
}
```

## 5.14. `CompleteBody`

```ts
{
  surcharges: Array<{
    name: string;    // 1..100
    amount: number;  // integer VND, 1..9_999_999_999
    note?: string;   // <= 255
  }>;                // bắt buộc, tối đa 50 phần tử, có thể []
  discount: number;  // integer VND >= 0
}
```

## 5.15. `ContactBody`

```ts
{
  method: "PHONE" | "ZALO" | "OTHER";
  note?: string;
}
```

## 5.16. `ActivityBody`

```ts
{
  type: "NOTE";
  content: string; // không rỗng
  petId?: string;  // ID pet thuộc khách
}
```

---

# 6. Response Models

Các Prisma model được trả về theo tên trường `camelCase`.

Quy ước:

- ID, ngày giờ và Decimal được chuyển kiểu theo các quy ước ở trên.
- Quan hệ chỉ xuất hiện nếu route mô tả có kèm quan hệ đó.
- Trường nullable có thể là `null`.

## 6.1. `Page<T>`

```ts
{
  items: T[];
  total: number;
  page: number;
  limit: number;
}
```

Mặc định:

```text
page = 1
limit = 20
limit tối đa = 100
```

## 6.2. `Profile`

```ts
{
  id: string;
  fullName: string;
  phone: string;
  address: string | null;
}
```

## 6.3. `Pet`

```ts
{
  id;
  customerId;
  name;
  species;
  breed;
  weight;
  allergyNote;
  specialNote;
  createdAt;
  updatedAt;
}
```

## 6.4. `Customer`

```ts
{
  id;
  userId;
  fullName;
  phone;
  address;
  note;
  createdAt;
  updatedAt;
}
```

Các trường tùy chọn có thể là `null`.

## 6.5. `Service`

```ts
{
  id;
  serviceName;
  description;
  estimatedDuration;
  status;
  createdAt;
  updatedAt;
}
```

## 6.6. `ServicePrice`

```ts
{
  id;
  serviceId;
  species;
  minWeight;
  maxWeight;
  price;
  effectiveFrom;
  effectiveTo;
  status;
  createdAt;
  updatedAt;
}
```

`maxWeight = null` nghĩa là không giới hạn cân nặng tối đa.

## 6.7. `ReminderConfig`

```ts
{
  id;
  serviceId;
  reminderDays;
  status;
  createdAt;
  updatedAt;
}
```

## 6.8. `Booking`

```ts
{
  id;
  customerId;
  petId;
  bookingDate;
  status;
  note;
  estimatedTotal;
  finalTotal;
  discountAmount;
  completedAt;
  cancelledAt;
  cancellationReason;
  createdAt;
  updatedAt;
}
```

Tùy route có thể thêm:

```text
pet
customer
services
surcharges
reminders
```

## 6.9. `BookingService`

```ts
{
  id;
  bookingId;
  serviceId;
  servicePriceId;
  petWeightSnapshot;
  basePrice;
  finalPrice;
  createdAt;
}
```

Trong một số danh sách có thể kèm quan hệ `service`.

## 6.10. `Surcharge`

```ts
{
  id;
  bookingId;
  bookingServiceId;
  surchargeName;
  amount;
  note;
  createdAt;
}
```

## 6.11. `Reminder`

```ts
{
  id;
  petId;
  customerId;
  bookingId;
  serviceId;
  completedDate;
  reminderDate;
  status;
  contactedAt;
  contactMethod;
  note;
  createdAt;
}
```

## 6.12. `Activity`

```ts
{
  id;
  customerId;
  petId;
  reminderId;
  type;
  content;
  createdBy;
  createdAt;
}
```

---

# 7. API Endpoints

## 7.1. Xác thực và hồ sơ

### `POST /auth/register`

**Mục đích:** Tạo tài khoản `CUSTOMER`; liên kết hồ sơ CRM có cùng số điện thoại nếu duy nhất.

**Auth:** Không cần cookie.

**Request:**

```text
Body: Register
```

**Response:**

```text
201 UserBrief {id, phone, role}
```

Chưa tạo phiên đăng nhập.

---

### `POST /auth/login`

**Mục đích:** Đăng nhập `CUSTOMER` hoặc `ADMIN`.

**Auth:** Không cần cookie.

**Request:**

```text
Body: Login
```

**Response:**

```text
201 AuthLogin {role, userId}
Set-Cookie: petcare_session
```

---

### `POST /auth/logout`

**Mục đích:** Thu hồi phiên hiện tại.

**Auth:** Cookie phiên.

**Request:** Body rỗng.

**Response:**

```json
{
  "success": true
}
```

Status:

```text
201
```

Cookie được xóa.

---

### `GET /me/profile`

**Mục đích:** Đọc hồ sơ của chủ nuôi đang đăng nhập.

**Auth:** Cookie `CUSTOMER`.

**Response:**

```text
200 Profile {id, fullName, phone, address}
```

---

### `PATCH /me/profile`

**Mục đích:** Sửa tên hoặc địa chỉ. Số điện thoại chỉ đọc.

**Auth:** Cookie `CUSTOMER`.

**Request:**

```text
Body: ProfilePatch
```

**Response:**

```text
200 Profile
```

---

## 7.2. Pet của chủ nuôi

### `GET /pets/mine`

**Mục đích:** Liệt kê pet thuộc tài khoản hiện tại.

**Auth:** Cookie `CUSTOMER`.

**Query:**

```text
page?
limit?
```

**Response:**

```text
200 Page<Pet>
```

---

### `GET /pets/{id}`

**Mục đích:** Xem một pet của mình.

**Auth:** Cookie `CUSTOMER`.

**Path:**

```text
id
```

**Response:**

```text
200 Pet
```

---

### `POST /pets`

**Mục đích:** Thêm pet cho mình.

**Auth:** Cookie `CUSTOMER`.

**Request:**

```text
Body: PetCreate
```

**Response:**

```text
201 Pet
```

---

### `PATCH /pets/{id}`

**Mục đích:** Cập nhật pet của mình.

**Auth:** Cookie `CUSTOMER`.

**Request:**

```text
Path: id
Body: PetPatch
```

**Response:**

```text
200 Pet
```

---

### `DELETE /pets/{id}`

**Mục đích:** Xóa pet chưa có booking hoặc reminder.

**Auth:** Cookie `CUSTOMER`.

**Path:**

```text
id
```

**Response:**

```text
200 Success
```

---

## 7.3. Dịch vụ công khai và booking của chủ nuôi

### `GET /services`

**Mục đích:** Danh sách dịch vụ đang bán.

**Auth:** Công khai.

**Query:**

```text
status=ACTIVE?
page?
limit?
```

**Response:**

```text
200 Page<Service>
```

---

### `GET /services/{id}/quote`

**Mục đích:** Lấy giá theo loài và cân nặng; dùng giá này khi đặt lịch.

**Auth:** Công khai.

**Request:**

```text
Path: id
Query:
  species=DOG|CAT
  weight=<chuỗi thập phân>
```

**Response:**

```ts
200 {
  serviceId,
  species,
  weight,
  servicePriceId,
  basePrice
}
```

---

### `POST /bookings`

**Mục đích:** Đặt một pet và một dịch vụ tại thời điểm tương lai.

**Auth:** Cookie `CUSTOMER`.

**Header bắt buộc:**

```http
Idempotency-Key: <unique-key>
```

**Request:**

```text
Body: BookingCreate
```

**Response:**

```text
201 Booking
```

Booking trả về kèm:

```text
services[1]
```

Trong đó chứa snapshot giá.

Request lặp với cùng `Idempotency-Key` có thể trả lại `201 Booking` chi tiết.

---

### `GET /bookings/mine`

**Mục đích:** Lịch đặt của chủ nuôi, mới nhất trước.

**Auth:** Cookie `CUSTOMER`.

**Query:**

```text
page?
limit?
```

**Response:**

```text
200 Page<Booking>
```

Kèm:

```text
pet
services.service
```

---

### `GET /bookings/{id}`

**Mục đích:** Xem chi tiết booking của mình.

**Auth:** Cookie `CUSTOMER`.

**Path:**

```text
id
```

**Response:**

```text
200 BookingDetail
```

Kèm:

```text
customer
pet
services
reminders
```

Thông tin chốt giá chỉ hiển thị khi booking ở trạng thái `COMPLETED`.

---

# 8. Admin API

## 8.1. Dashboard và khách hàng CRM

### `GET /admin/dashboard`

**Mục đích:** Đếm:

- Booking chờ xác nhận.
- Booking đã xác nhận hôm nay.
- Reminder đến hạn.

**Auth:** Cookie `ADMIN`.

**Response:**

```json
{
  "pending": 0,
  "confirmedToday": 0,
  "remindersDue": 0
}
```

Status:

```text
200
```

---

### `GET /admin/customers`

**Mục đích:** Tìm khách theo tên hoặc số điện thoại, mới nhất trước.

**Auth:** Cookie `ADMIN`.

**Query:**

```text
q?
page?
limit?
```

**Response:**

```text
200 Page<Customer>
```

---

### `GET /admin/customers/{id}`

**Mục đích:** Hồ sơ 360 độ của khách.

**Auth:** Cookie `ADMIN`.

**Path:**

```text
id
```

**Response:**

```text
200 Customer
```

Kèm:

```text
pets
bookings: 20 booking mới nhất, mỗi booking có services
activities: 20 activity mới nhất
```

---

### `POST /admin/customers`

**Mục đích:** Tạo hồ sơ CRM chưa cần tài khoản.

**Auth:** Cookie `ADMIN`.

**Request:**

```text
Body: CustomerCreate
```

**Response:**

```text
201 Customer
```

---

### `PATCH /admin/customers/{id}`

**Mục đích:** Sửa hồ sơ CRM.

Quy tắc:

```text
Hồ sơ đã gắn tài khoản không được đổi số điện thoại.
```

**Auth:** Cookie `ADMIN`.

**Request:**

```text
Path: id
Body: CustomerPatch
```

**Response:**

```text
200 Customer
```

---

### `DELETE /admin/customers/{id}`

**Mục đích:** Xóa khách chưa có tài khoản hoặc dữ liệu phụ thuộc.

**Auth:** Cookie `ADMIN`.

**Path:**

```text
id
```

**Response:**

```text
200 Success
```

---

## 8.2. Pet trong CRM

### `GET /admin/customers/{id}/pets`

**Mục đích:** Liệt kê pet của một khách.

**Auth:** Cookie `ADMIN`.

**Request:**

```text
Path: id
Query:
  page?
  limit?
```

**Response:**

```text
200 Page<Pet>
```

---

### `POST /admin/customers/{id}/pets`

**Mục đích:** Thêm pet vào hồ sơ khách.

**Auth:** Cookie `ADMIN`.

**Request:**

```text
Path: id
Body: PetCreate
```

**Response:**

```text
201 Pet
```

---

### `PATCH /admin/pets/{petId}`

**Mục đích:** Sửa pet trong CRM.

**Auth:** Cookie `ADMIN`.

**Request:**

```text
Path: petId
Body: PetPatch
```

**Response:**

```text
200 Pet
```

---

### `DELETE /admin/pets/{petId}`

**Mục đích:** Xóa pet chưa có booking hoặc reminder.

**Auth:** Cookie `ADMIN`.

**Path:**

```text
petId
```

**Response:**

```text
200 Success
```

---

## 8.3. Danh mục dịch vụ và bảng giá

### `GET /admin/services`

**Mục đích:** Liệt kê cả dịch vụ `ACTIVE` và `INACTIVE`.

**Auth:** Cookie `ADMIN`.

**Query:**

```text
page?
limit?
```

**Response:**

```text
200 Page<Service>
```

---

### `POST /admin/services`

**Mục đích:** Thêm dịch vụ.

Dịch vụ mới ở trạng thái:

```text
INACTIVE
```

**Auth:** Cookie `ADMIN`.

**Request:**

```text
Body: ServiceCreate
```

**Response:**

```text
201 Service
```

---

### `PATCH /admin/services/{id}`

**Mục đích:** Sửa tên, mô tả hoặc thời lượng.

**Auth:** Cookie `ADMIN`.

**Request:**

```text
Path: id
Body: ServicePatch
```

**Response:**

```text
200 Service
```

---

### `PATCH /admin/services/{id}/status`

**Mục đích:** Mở hoặc ngừng bán dịch vụ.

Quy tắc:

```text
Muốn chuyển dịch vụ sang ACTIVE cần ít nhất một khoảng giá ACTIVE.
```

**Auth:** Cookie `ADMIN`.

**Request:**

```text
Path: id
Body: StatusBody
```

**Response:**

```text
200 Service
```

---

### `GET /admin/services/{id}/prices`

**Mục đích:** Liệt kê khoảng giá `ACTIVE` của dịch vụ.

**Auth:** Cookie `ADMIN`.

**Request:**

```text
Path: id
Query:
  species=DOG|CAT?
  page?
  limit?
```

**Response:**

```text
200 Page<ServicePrice>
```

Không trả các giá `INACTIVE`.

---

### `POST /admin/services/{id}/prices`

**Mục đích:** Thêm khoảng giá cho `DOG` hoặc `CAT`.

**Auth:** Cookie `ADMIN`.

**Request:**

```text
Path: id
Body: PriceBody
```

**Response:**

```text
201 ServicePrice
```

---

### `PATCH /admin/services/{id}/prices/{priceId}`

**Mục đích:** Sửa toàn bộ loài, khoảng cân nặng và giá của một rule.

**Auth:** Cookie `ADMIN`.

**Request:**

```text
Path:
  id
  priceId

Body: PriceBody
```

`PriceBody` phải gửi đầy đủ các trường bắt buộc.

**Response:**

```text
200 ServicePrice
```

---

### `PATCH /admin/prices/{priceId}/status`

**Mục đích:** Bật hoặc tắt khoảng giá.

Quy tắc:

```text
Khi bật một khoảng giá, các khoảng không được chồng nhau.
```

**Auth:** Cookie `ADMIN`.

**Request:**

```text
Path: priceId
Body: StatusBody
```

**Response:**

```text
200 ServicePrice
```

---

### `GET /admin/services/{id}/reminder-config`

**Mục đích:** Lấy cấu hình nhắc `ACTIVE` của dịch vụ.

**Auth:** Cookie `ADMIN`.

**Path:**

```text
id
```

**Response:**

```text
200 ReminderConfig
```

Hoặc:

```text
null
```

nếu chưa cấu hình.

---

### `PUT /admin/services/{id}/reminder-config`

**Mục đích:** Tạo hoặc cập nhật chu kỳ nhắc.

**Auth:** Cookie `ADMIN`.

**Request:**

```text
Path: id
Body:
{
  reminderDays: 8..364
}
```

**Response:**

```text
200 ReminderConfig
```

---

## 8.4. Booking cho Admin

### `GET /admin/bookings`

**Mục đích:** Lọc booking theo trạng thái và ngày hẹn Việt Nam.

**Auth:** Cookie `ADMIN`.

**Query:**

```text
status?
date=YYYY-MM-DD?
page?
limit?
```

**Response:**

```text
200 Page<Booking>
```

Kèm:

```text
customer
pet
services.service
```

---

### `GET /admin/bookings/{id}`

**Mục đích:** Xem đầy đủ booking, phụ phí và reminder.

**Auth:** Cookie `ADMIN`.

**Path:**

```text
id
```

**Response:**

```text
200 BookingDetail
```

---

### `POST /admin/bookings/{id}/confirm`

**Mục đích:** Chuyển booking:

```text
PENDING -> CONFIRMED
```

**Auth:** Cookie `ADMIN`.

**Request:**

```text
Path: id
Body: rỗng
```

**Response:**

```text
201 Booking
```

---

### `POST /admin/bookings/{id}/cancel`

**Mục đích:** Hủy booking từ:

```text
PENDING
```

hoặc:

```text
CONFIRMED
```

**Auth:** Cookie `ADMIN`.

**Request:**

```text
Path: id
Body: CancelBody hoặc {}
```

**Response:**

```text
201 Booking
```

Booking có:

```text
status = CANCELLED
cancelledAt
cancellationReason
```

---

### `POST /admin/bookings/{id}/complete`

**Mục đích:** Chốt giá và tạo reminder trong một transaction.

**Auth:** Cookie `ADMIN`.

**Request:**

```text
Path: id
Body: CompleteBody
```

**Response:**

```text
201 BookingDetail
```

Kèm:

```text
services
surcharges
reminders
finalTotal
```

---

## 8.5. Reminder và hoạt động CRM

### `GET /admin/reminders`

**Mục đích:** Liệt kê reminder, ngày cũ trước.

Khi:

```text
due=true
```

chỉ lấy reminder:

```text
chưa xử lý và đến hạn tính đến hết hôm nay
```

**Auth:** Cookie `ADMIN`.

**Query:**

```text
due=true|false?
page?
limit?
```

**Response:**

```text
200 Page<Reminder>
```

Kèm:

```text
customer
pet
service
```

---

### `GET /admin/reminders/{id}`

**Mục đích:** Xem bối cảnh trước khi liên hệ khách.

**Auth:** Cookie `ADMIN`.

**Path:**

```text
id
```

**Response:**

```text
200 ReminderDetail
```

Kèm:

```text
customer
pet.activities
service
booking.services
booking.surcharges
```

---

### `POST /admin/reminders/{id}/contact`

**Mục đích:** Đánh dấu đã liên hệ và tạo activity.

**Auth:** Cookie `ADMIN`.

**Request:**

```text
Path: id
Body: ContactBody
```

**Response:**

```text
201 Reminder
```

Reminder có:

```text
status = CONTACTED
contactedAt
contactMethod
note
```

---

### `GET /admin/customers/{id}/activities`

**Mục đích:** Lịch sử hoạt động CRM của khách.

**Auth:** Cookie `ADMIN`.

**Request:**

```text
Path: id
Query:
  page?
  limit?
```

**Response:**

```text
200 Page<Activity>
```

Kèm user:

```ts
{
  id,
  phone
}
```

---

### `POST /admin/customers/{id}/activities`

**Mục đích:** Tạo ghi chú thủ công cho khách hoặc pet của khách.

**Auth:** Cookie `ADMIN`.

**Request:**

```text
Path: id
Body: ActivityBody
```

**Response:**

```text
201 Activity
```

Activity có:

```text
type = NOTE
```

---

# 9. Ví dụ tích hợp

## 9.1. Đăng nhập

```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "phone": "0901234567",
  "password": "secret123"
}
```

Response:

```text
201
```

```json
{
  "role": "CUSTOMER",
  "userId": "12"
}
```

Server đồng thời trả:

```text
Set-Cookie: petcare_session
```

---

## 9.2. Báo giá dịch vụ

```http
GET /services/3/quote?species=DOG&weight=7.00
```

Response:

```json
{
  "serviceId": "3",
  "species": "DOG",
  "weight": "7",
  "servicePriceId": "7",
  "basePrice": 250000
}
```

---

## 9.3. Đặt lịch

```http
POST /bookings
Idempotency-Key: booking-form-uuid
Content-Type: application/json
```

```json
{
  "petId": "4",
  "serviceId": "3",
  "bookingDate": "2026-11-01T09:00:00+07:00",
  "expectedBasePrice": 250000,
  "note": "Tắm nhẹ"
}
```

Response:

```text
201 Booking
```

Booking có:

```text
status = PENDING
estimatedTotal = 250000
services[0].basePrice = 250000
```

---

## 9.4. Hoàn thành booking

```http
POST /admin/bookings/9/complete
Content-Type: application/json
```

```json
{
  "surcharges": [
    {
      "name": "Gỡ rối lông",
      "amount": 50000
    }
  ],
  "discount": 20000
}
```

Response:

```text
201 Booking
```

Booking có:

```text
status = COMPLETED
finalTotal = 280000
```

và có reminder mới.

---

# 10. Quy tắc trạng thái và nghiệp vụ

## 10.1. Booking

Các trạng thái được tài liệu đề cập:

```text
PENDING
CONFIRMED
COMPLETED
CANCELLED
```

Luồng chính:

```text
PENDING -> CONFIRMED -> COMPLETED
```

Admin có thể hủy từ:

```text
PENDING -> CANCELLED
CONFIRMED -> CANCELLED
```

Khi hoàn thành booking:

```text
Cần có reminder config ACTIVE để tạo reminder.
```

Cách tính:

```text
finalTotal = basePrice snapshot + tổng phụ phí - discount
```

`finalTotal` không được âm.

## 10.2. Reminder

Khi liên hệ thành công:

```text
status -> CONTACTED
```

Reminder sau đó biến khỏi danh sách:

```text
GET /admin/reminders?due=true
```

Lưu ý:

```text
GET /admin/reminders
```

khi không truyền `due=true` thì **không lọc trạng thái**, kể cả khi dùng `due=false`.

---

# 11. Endpoint Index cho AI Agent

## Public

```text
POST   /auth/register
POST   /auth/login
GET    /services
GET    /services/{id}/quote
```

## CUSTOMER

```text
POST   /auth/logout
GET    /me/profile
PATCH  /me/profile

GET    /pets/mine
GET    /pets/{id}
POST   /pets
PATCH  /pets/{id}
DELETE /pets/{id}

POST   /bookings
GET    /bookings/mine
GET    /bookings/{id}
```

## ADMIN

```text
POST   /auth/logout

GET    /admin/dashboard

GET    /admin/customers
GET    /admin/customers/{id}
POST   /admin/customers
PATCH  /admin/customers/{id}
DELETE /admin/customers/{id}

GET    /admin/customers/{id}/pets
POST   /admin/customers/{id}/pets
PATCH  /admin/pets/{petId}
DELETE /admin/pets/{petId}

GET    /admin/services
POST   /admin/services
PATCH  /admin/services/{id}
PATCH  /admin/services/{id}/status

GET    /admin/services/{id}/prices
POST   /admin/services/{id}/prices
PATCH  /admin/services/{id}/prices/{priceId}
PATCH  /admin/prices/{priceId}/status

GET    /admin/services/{id}/reminder-config
PUT    /admin/services/{id}/reminder-config

GET    /admin/bookings
GET    /admin/bookings/{id}
POST   /admin/bookings/{id}/confirm
POST   /admin/bookings/{id}/cancel
POST   /admin/bookings/{id}/complete

GET    /admin/reminders
GET    /admin/reminders/{id}
POST   /admin/reminders/{id}/contact

GET    /admin/customers/{id}/activities
POST   /admin/customers/{id}/activities
```

---

# 12. Quick Rules for AI Agent

Khi sinh code tích hợp API, AI Agent cần tuân thủ:

1. Không tự thêm prefix `/api/v1`.
2. Route CUSTOMER/ADMIN phải dùng cookie `petcare_session`.
3. FE khác origin phải gửi `credentials: "include"`.
4. Không cố đọc cookie `HttpOnly` bằng JavaScript.
5. ID BIGINT phải xử lý như `string`.
6. Tiền là integer VND.
7. Cân nặng gửi dưới dạng chuỗi thập phân.
8. Danh sách dùng `page` / `limit`; `limit <= 100`.
9. Trước khi tạo booking phải gọi quote.
10. `expectedBasePrice` phải lấy từ quote gần nhất.
11. `POST /bookings` phải có `Idempotency-Key`.
12. Nếu nhận `PRICE_CHANGED`, không tự đặt lịch lại mà phải hiển thị giá mới và yêu cầu người dùng xác nhận.
13. Không cho CUSTOMER chỉnh `phone` qua `/me/profile`.
14. Không cho đổi số điện thoại CRM nếu customer đã gắn tài khoản.
15. Không xóa pet nếu pet đã có booking hoặc reminder.
16. Service mới tạo ở trạng thái `INACTIVE`.
17. Chỉ được bật service khi có ít nhất một price range `ACTIVE`.
18. Price range `ACTIVE` không được chồng nhau.
19. Admin chỉ confirm booking từ `PENDING`.
20. Admin chỉ cancel booking từ `PENDING` hoặc `CONFIRMED`.
21. Khi complete booking, `finalTotal` không được âm.
22. Reminder được đánh dấu `CONTACTED` sau khi liên hệ thành công.
23. Query ngày booking/reminder phải hiểu theo timezone `Asia/Ho_Chi_Minh`.

---

# 13. Source of Truth

Tài liệu này mô tả API backend hiện tại cho Frontend.

Khi AI Agent thực hiện task liên quan API:

```text
Ưu tiên endpoint, schema, validation, status và business rule trong file này.
Không tự suy diễn thêm endpoint hoặc field chưa được mô tả.
Nếu thiếu thông tin cần thiết, phải kiểm tra backend implementation hoặc Swagger `/openapi`.
```
