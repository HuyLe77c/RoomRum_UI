# Đánh giá trải nghiệm bản đồ và vị trí RoomRum

Ngày kiểm tra: 20/10/2026; cập nhật 21/10/2026. Kiểm tra giao diện mobile tại `/map`, API phòng và geocode, luồng đăng/chỉnh sửa phòng, trang bộ lọc nâng cao và mã nguồn FE/BE.

## Nhận xét thẳng

| Mức | Vấn đề và tác động với người dùng | Trạng thái |
| --- | --- | --- |
| Nghiêm trọng | Tìm “Quận 1” trước đây tự chọn tọa độ 21.034709, 105.824519 ở Hà Nội. Người dùng tin rằng đang tìm tại TP. Hồ Chí Minh và thấy 0 phòng. | Đã sửa: bắt chọn kết quả cụ thể; BE loại kết quả không khớp. |
| Nghiêm trọng | Form đăng phòng tự gán ghim của gợi ý địa chỉ đầu tiên khi người đăng còn đang gõ; BE cũng tự geocode rồi lưu kết quả đầu tiên. Ghim có thể sai mà không được xác nhận. | Đã sửa: chỉ lưu tọa độ người dùng chủ động chọn. |
| Nghiêm trọng | Nhấn “Xóa vị trí” khi sửa phòng nhưng giữ địa chỉ thì BE khôi phục tọa độ cũ. | Đã sửa `clearCoordinates`. |
| Nghiêm trọng | Form quản trị gửi `null` cho ảnh/tiện nghi; BE coi như danh sách rỗng và xóa quan hệ khi lưu. | Đã sửa: `null` giữ nguyên. Quản trị dùng form có bản đồ. |
| Cao | Bản đồ tải đúng 100 phòng đầu, các phòng còn lại không có marker và trước đây không có cách tải tiếp. | Đã thêm phân trang “Tải thêm phòng”, thông báo số đã tải. |
| Cao | Khi marker/danh sách thay đổi, bản đồ tự fit lại, làm mất vị trí người dùng vừa kéo tới. | Đã sửa: chỉ tự fit lần đầu khi chưa có tâm tìm kiếm. |
| Cao | Mở bản đồ trên mobile che danh sách kết quả; khi API lỗi, người dùng chỉ thấy “0 vị trí phòng”, dễ tưởng thật sự không có phòng. | Đã thêm cảnh báo lỗi và nút thử lại ngay trên bản đồ. |
| Trung bình | Tìm địa danh trùng tên khó phân biệt vì không có danh sách gợi ý trên `/map`; phím mũi tên và Escape thiếu. | Đã thêm danh sách có tên địa điểm đầy đủ và điều khiển bàn phím. |
| Trung bình | Trên mobile, ba nút bản đồ che nhiều diện tích xem bản đồ. | Đã thu gọn thành nút biểu tượng ở màn hình hẹp, giữ nhãn hỗ trợ truy cập. |
| Trung bình | Thẩm mỹ xanh trắng thống nhất, nhưng màn hình bản đồ còn dày thanh công cụ, huy hiệu và chú giải; nhiều chữ chỉ 10–12 px nên khó đọc nhanh ngoài trời. | Đã giảm phần che bản đồ trên mobile, tăng cỡ chữ của thông tin chính và kiểm tra lại nút chuyển danh sách. |
| Trung bình | Tâm và bán kính chỉ rõ ở danh sách; ở chế độ bản đồ mobile rất khó biết mình đang lọc quanh đâu. | Đã đưa khu vực/bán kính vào nhãn trên bản đồ. |
| Trung bình | Kết quả địa điểm dựa vào dịch vụ ngoài; có độ trễ và phụ thuộc mạng. | Chưa xử lý triệt để; hiện có debounce, trạng thái đang tìm, lỗi và cách chọn trực tiếp trên bản đồ. |
| Trung bình | Bộ FE đầu ra còn lớn (~1.6 MB JS chính và ~520 KB map worker), tải lần đầu trên mạng chậm có thể chưa mượt. | Đã tách trang: JS chính còn khoảng 285 KB; MapLibre và worker chỉ tải khi vào màn hình dùng bản đồ. Cần đo chỉ số thực trên thiết bị tầm trung. |
| Trung bình | Bản đồ chọn ghim ở form dùng lớp vector bên ngoài, chưa có fallback rõ ràng khi tile server lỗi. | Đã thêm lớp OpenStreetMap cơ bản dự phòng và thông báo cho người dùng. |
| Thấp | Marker giá và bảng điều khiển trên màn hình nhỏ có thể chồng nhau khi mật độ phòng cao; chưa có gom cụm marker. | Đã gom marker theo khoảng cách màn hình và mức zoom, có danh sách phòng trong cụm. Đã thử với 132 phòng giả lập. |

## Giới hạn kiểm thử

API thật `/api/rooms` trong môi trường hiện tại trả `total = 0`. Một API giả lập chỉ chạy trên máy cục bộ (`scripts/mock-map-api.mjs`) đã được dùng để thử 132 phòng, trong đó 8 phòng thiếu tọa độ: tải thêm đủ 132, gom cụm marker và mở popup phòng từ danh sách. Dữ liệu giả lập không được ghi vào database. Chưa có tài khoản thử để thao tác lưu phòng từ giao diện. Không thử cấp quyền GPS của trình duyệt. Cần kiểm tra lại các luồng này trên bộ dữ liệu thử có quyền truy cập và thiết bị thật.

## Ưu tiên tiếp theo

1. Kiểm tra lại với tài khoản chủ phòng/quản trị và dữ liệu thử trong database để xác nhận lưu ghim, xóa ghim và giữ ảnh/tiện nghi.
2. Đo LCP/INP/CLS trên thiết bị tầm trung với mạng chậm; MapLibre (~1.2 MB) và worker (~520 KB) vẫn nặng ở trang bản đồ.
3. Thử trực tiếp desktop, GPS và tình huống nhà cung cấp địa điểm/tile bị lỗi; trình duyệt thử nghiệm trong lượt này chỉ có viewport mobile.
