# RoomRum Web

Giao diện React + TypeScript + Vite cho RoomRum. Hướng hình ảnh chính theo mẫu Figma Make `PRN232-RoomRum`; các bản HTML xuất riêng được dùng để tham khảo bố cục các trang. Nội dung phòng, số lượng và tài khoản được tải từ API, không dùng dữ liệu mẫu.

## Chạy trong VS Code

Mở thư mục `RoomRum_UI-main` bằng VS Code, sau đó chạy trong terminal:

```powershell
npm install
npm run dev
```

Mở `http://localhost:5173`. Vite chuyển tiếp `/api` đến `http://localhost:5041` theo `vite.config.ts`. API RoomRum cần đang chạy trên cổng đó; ví dụ, tại thư mục API:

```powershell
dotnet run --launch-profile http
```

Kiểm tra bản build:

```powershell
npm run build
```

## Cấu trúc mã nguồn

- `src/app/`: route của ứng dụng; các URL công khai và theo vai trò được giữ tại đây.
- `src/features/`: trang và mã theo tính năng (`home`, `rooms`, `search`, `maps`, `auth`, `sharing`, `landlord`, `dashboard`). Mỗi màn hình chủ trọ và bảng điều khiển có module riêng.
- `src/shared/api/`, `auth/`, `hooks/`, `types/`, `utils/`, `components/`: mã dùng chung; `src/shared/ui.ts` là điểm xuất chung cho các trang.
- `src/styles/`: CSS được chia theo khu vực và import theo thứ tự cũ trong `src/main.tsx`; CSS bản đồ chính ở `src/features/maps/map.css`.

Việc tổ chức lại thư mục chỉ thay vị trí module và đường dẫn import; route, lời gọi API, dữ liệu và hành vi giao diện được giữ nguyên.

## Các trang

- Công khai: trang chủ, tìm kiếm/lọc phòng, chi tiết phòng, bản đồ, ở ghép.
- Tài khoản: đăng ký, đăng nhập.
- Người thuê: bảng điều khiển, phòng yêu thích, lịch hẹn, phòng đang thuê, ở ghép, sửa chữa, báo cáo, tin nhắn, hồ sơ.
- Chủ phòng (đang được ưu tiên hoàn thiện): tổng quan công việc, tạo/sửa/ẩn phòng, lịch hẹn, người thuê, sửa chữa, tin nhắn, hồ sơ.
- Quản trị: tổng quan, người dùng, tiện ích, báo cáo, hồ sơ.

Các trang và thao tác phụ thuộc vai trò tài khoản và dữ liệu hiện có trong `RoomRum_db`. Khi cơ sở dữ liệu trống, giao diện hiện trạng thái trống thay vì tạo phòng hoặc chỉ số giả.

Form sửa phòng cần API `/api/rooms/mine` trả cả `amenities` và `images` để giữ các liên kết hiện có. Danh sách hội thoại cần `otherUserId` và `otherUserName` để chủ trọ nhận ra người đang trò chuyện. Hai phần này đã được bổ sung trong BLL của API cùng workspace. Nếu chạy API từ bản cũ, cần build và khởi động lại API.

Chủ trọ mời người thuê bằng email đã đăng ký qua `POST /api/room-tenants/{roomId}/invite-by-email`. API chỉ nhận tài khoản người thuê đang hoạt động và kiểm tra người gửi sở hữu phòng. Luồng mời bằng ID cũ vẫn được giữ để tương thích với client trước đó.

## Bản đồ

Bản đồ chính và các bản đồ chọn vị trí dùng nền vector OpenFreeMap với các kiểu Phố rõ, Tối giản, Đậm nét; người xem có thể chọn Cơ bản để dùng tile OpenStreetMap. Lựa chọn được lưu trong trình duyệt và nếu nền vector không tải được thì trang chuyển sang nền Cơ bản. Marker ghim các tọa độ đã lưu trong `RoomRum_db`; popup lấy thêm mô tả và tiện ích từ API khi chọn phòng. Khi chủ trọ nhập địa chỉ, form tự tra vị trí qua API và đặt ghim; chủ trọ có thể nhấn bản đồ để chỉnh. Phòng chưa có tọa độ vẫn xuất hiện trong danh sách nhưng không có marker. Người xem có thể tìm địa điểm, dùng vị trí hiện tại, chọn tâm bằng cách nhấn bản đồ, hoặc tìm phòng trong khung bản đồ đang xem. Các thao tác đó dùng bộ lọc bán kính của API; khoảng cách là đường chim bay. Liên kết từ trang chi tiết mở đúng marker của phòng.

Tra cứu tên địa điểm đi qua `GET /api/locations/search` của API để dùng cache và giới hạn tốc độ chung, không gọi Photon trực tiếp từ trình duyệt. Dịch vụ tra cứu và nền bản đồ cần Internet. `VITE_MAP_TILE_URL` chỉ thay URL của nền Cơ bản khi build. Nếu triển khai với lượng truy cập lớn, cấu hình dịch vụ geocoding/tile có năng lực phù hợp và tuân thủ điều khoản của nhà cung cấp.
