# Circle Social

MVP mạng xã hội responsive dùng Bun, Elysia, Drizzle ORM, PostgreSQL, React, TailwindCSS và JWT HttpOnly cookies. PostgreSQL là kho lưu trữ duy nhất, kể cả ảnh (`bytea`).

## Yêu cầu

- Bun 1.4+
- PostgreSQL 15+

## Chạy local

```bash
cp .env.example .env
bun install
bun db:migrate
bun db:seed
bun dev
```

Web chạy tại `http://localhost:5173`, API tại `http://localhost:3000`. Tài khoản admin lấy từ `SEED_ADMIN_EMAIL` và `SEED_ADMIN_PASSWORD`.

## Lệnh chính

```bash
bun dev:api
bun dev:web
bun typecheck
bun test
bun build
bun db:generate
```

Không có Docker, MinIO, Redis hay dịch vụ lưu trữ ngoài.

## Deploy frontend và backend trên Render

Backend Web Service:

```text
Root directory: (để trống, dùng thư mục gốc repository)
Build command: bun install
Start command: bun --filter @circle/api start
Health check path: /health
```

Các biến môi trường backend bắt buộc:

```text
DATABASE_URL=<PostgreSQL production URL>
JWT_ACCESS_SECRET=<chuỗi ngẫu nhiên tối thiểu 32 ký tự>
JWT_REFRESH_SECRET=<chuỗi ngẫu nhiên khác tối thiểu 32 ký tự>
NODE_ENV=production
WEB_ORIGIN=https://<frontend>.onrender.com
```

Không tự đặt `PORT`; Render cung cấp biến này và API tự động sử dụng nó.

Frontend Static Site:

```text
Root directory: (để trống, dùng thư mục gốc repository)
Build command: bun install && bun --filter @circle/web build
Publish directory: apps/web/dist
```

Trong phần Redirects/Rewrites của Static Site, thêm rewrite:

```text
Source: /*
Destination: /index.html
Action: Rewrite
```

Thêm hai biến build-time rồi deploy lại frontend:

```text
VITE_API_URL=https://<backend>.onrender.com
VITE_WS_URL=wss://<backend>.onrender.com/ws
```

Frontend và backend dùng hai origin khác nhau, vì vậy production cookie được đặt
với `SameSite=None; Secure`. `WEB_ORIGIN` phải khớp chính xác URL frontend,
không có dấu `/` ở cuối. Nếu có nhiều frontend/preview, dùng `WEB_ORIGINS` và
phân tách các URL bằng dấu phẩy.

## Kiến trúc backend

Backend dùng composition root tại `apps/api/src/app.ts`; `index.ts` chỉ khởi động HTTP server. Mỗi domain trong `apps/api/src/modules` có cùng cấu trúc:

```text
<module>/
├── <module>.routes.ts       # HTTP và cookie/status
├── <module>.service.ts      # nghiệp vụ và phân quyền
├── <module>.repository.ts   # Drizzle/PostgreSQL
├── <module>.schema.ts       # Zod input schemas
└── <module>.types.ts        # kiểu dữ liệu module
```

Các module hiện có:

- `auth`: đăng ký, đăng nhập, refresh và logout.
- `users`: hồ sơ, tìm kiếm và upload avatar/cover.
- `friends`: lời mời và quan hệ bạn bè.
- `posts`: bài viết, feed, Like, serializer và quyền xem bài viết.
- `comments`: bình luận và reply một cấp.
- `notifications`: tạo thông báo, danh sách và trạng thái đã đọc.
- `media`: phân quyền và stream ảnh từ PostgreSQL.
- `admin`: quản lý tài khoản và moderation.

Mọi input từ body, params và query được kiểm tra bằng Zod qua
`shared/validation.ts`. `shared/http.ts` chỉ chứa cấu hình HTTP và cookie;
quyền truy cập cùng logic tạo thông báo nằm trong module tương ứng. JWT và
database được giữ tách biệt ở cấp `src`.
