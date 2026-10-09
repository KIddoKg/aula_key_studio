# Aula Key Studio

Phần mềm cấu hình bàn phím AULA chạy ngay trong trình duyệt — dùng được trên **macOS**, Linux và Windows,
không cần cài driver, không cần build: tải repo về rồi mở `index.html` bằng Chrome / Edge / Brave là xong.

> Driver chính hãng của AULA chỉ chạy trên Windows. Aula Key Studio nói chuyện trực tiếp với bàn phím qua
> [WebHID](https://developer.mozilla.org/docs/Web/API/WebHID_API).

## Tính năng

- **Hiệu ứng đèn**: 19 hiệu ứng + tắt đèn, độ sáng, tốc độ, hướng, màu đơn hoặc Colorful, có xem trước động.
- **Đèn từng phím**: tô / tẩy / lấy màu, tô nhanh (cầu vồng, WASD…), thử đèn từng phím.
- **Phím & Layer**: gán phím đơn, tổ hợp, phím media, chuột, macro cho Top Layer và Fn Layer.
- **Macro**: ghi phím và chuột theo thời gian thật, sửa độ trễ.
- **Màn hình GIF & giờ**: tải GIF/ảnh lên màn hình, cắt khung, xoay, chỉnh tốc độ, bỏ bớt khung; đồng bộ giờ.
- **Cài đặt**: thời gian ngủ, tốc độ phản hồi, khoá Win / Alt+Tab / Alt+F4, sao lưu / khôi phục.
- **Hiệu chỉnh sơ đồ phím**: bấm lần lượt từng phím để tool biết chính xác vị trí phím trên mọi mẫu.

## Mẫu hỗ trợ

Các bàn phím AULA dùng chip SONiX (USB `0C45:800A`), tự nhận mẫu qua tên USB:

| Mẫu | Màn hình | Ghi chú |
|---|---|---|
| AULA S75 Pro | 135 × 240 (dọc) | đã thử trên máy thật |
| AULA F75 Max | 128 × 128 | |
| AULA F108 Pro | 240 × 135 | |
| F75 / F75 Pro, F65, F87 / F87 Pro, F99 / F99 Pro, F2088 | — | sơ đồ gần đúng, nên chạy hiệu chỉnh |
| Mẫu khác | — | chọn sơ đồ chung 60% / 65% / 75% / TKL / 96% / 100% |

Mẫu dùng chip khác sẽ không hiện trong danh sách kết nối.

## Cách dùng

1. Mở `index.html` bằng **Chrome, Edge hoặc Brave** (Safari và Firefox không hỗ trợ WebHID).
2. Gạt bàn phím sang **chế độ có dây** và cắm cáp USB (dongle 2.4 GHz / Bluetooth không cấu hình được).
3. Bấm **Chưa kết nối** ở góc trên bên phải và chọn bàn phím.
4. Lần đầu với mỗi mẫu: vào **Phím & Layer → Hiệu chỉnh sơ đồ phím** (nhớ tắt bộ gõ tiếng Việt trước).

Bàn phím không cho đọc lại cài đặt, nên tool lưu một bản trong trình duyệt. Nếu đã chỉnh bằng phần mềm khác,
vào **Cài đặt → Gửi tất cả** để đồng bộ lại.

## Cấu trúc

```
index.html            giao diện (các trang, hộp thoại)
css/style.css         toàn bộ style
js/data.js            sơ đồ phím, danh sách mẫu, mã phím HID
js/state.js           trạng thái lưu trong trình duyệt, mẫu đang chọn
js/protocol.js        giao thức USB (đèn, phím, macro, màn hình, giờ)
js/connection.js      kết nối WebHID, tự nhận mẫu, màn chờ, chọn mẫu
js/widgets.js         vẽ bàn phím, bánh xe màu, thanh trượt
js/navigation.js      chuyển trang
js/page-*.js          từng trang: đèn, đèn từng phím, phím, macro, màn hình, cài đặt
js/calibration.js     hiệu chỉnh sơ đồ phím
js/main.js            khởi động
```

Các file JS là script thường (không phải ES module) để mở thẳng từ ổ đĩa (`file://`) vẫn chạy.
Thứ tự nạp trong `index.html` quan trọng.

## Giới hạn

- Tải ảnh lên màn hình khá chậm (~64 KB/giây) do giới hạn USB của bàn phím. Bỏ bớt khung để nhanh hơn.
- Núm xoay do firmware điều khiển, không đổi chức năng được.
- Hình xem trước hiệu ứng đèn là mô phỏng gần đúng.

## Ghi công

Giao thức USB tham khảo từ tài liệu của [OpenAula](https://github.com/leoben49/OpenAula) và
[parsiya/f108-pro](https://github.com/parsiya/f108-pro). Dự án độc lập, không liên kết với AULA hay EPOMAKER.
Dùng với rủi ro của riêng bạn.
