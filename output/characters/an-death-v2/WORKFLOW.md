# Death An — 11 frame

## Reference

Chỉ dùng idle đã duyệt của **An** làm reference nhận diện. Không gửi ảnh Yuki vào công cụ tạo ảnh. Động tác theo yêu cầu: đứng → quỳ → ngã úp mặt, hai tay thả lỏng về sau.

## Hai lượt tạo

1. Tạo cùng lúc 6 frame đầu: idle, hạ vai/gập gối, khuỵu sâu, chạm gối, ngồi xuống gót, quỳ hoàn toàn. Một ảnh 3 cột × 2 hàng.
2. Cắt frame 6 của chính An làm reference tiếp nối, kèm idle An để giữ tóc xám đen, mặt và trang phục. Tạo cùng lúc 5 frame cuối: buông tay, nghiêng người, đổ người, chạm đất, nằm úp. Tay buông về hông, không chống ra trước. Một ảnh 3 cột × 2 hàng, ô cuối trống.

## Cắt và ghép

- Giữ alpha PNG; không lấy màu nền xem trước làm nền ảnh.
- Tách từng sprite, dùng chung một tỉ lệ cho mỗi lượt, lượt sau khớp kích thước frame 6.
- Chuẩn hóa về 512 × 512; cùng đường tiếp đất, điểm neo ổn định.
- Frame 1 dùng lại chính idle An đã duyệt.
- Ghép death.png thành 11 ô liên tiếp, 5632 × 512.
- GIF xem thử 10 FPS; bản chậm 180 ms/frame, giữ hình cuối 700 ms. Đây là tốc độ preview, chưa sửa thời gian trong game.

## File

death-01.png…death-11.png: từng frame riêng. death.png: spritesheet. preview.gif và preview-slow.gif: animation xem thử. contact-sheet.png: các frame có số. prompts.json: nguyên văn hai prompt. kneel-alignment.json và fall-alignment.json: tỉ lệ và điểm neo. assemble.py: quy trình cắt, chuẩn hóa và ghép.

Tạo bằng công cụ image_gen tích hợp; chỉ dùng Python cho cắt/ghép. Bộ này là bản làm lại v2, thay bộ thử bị lẫn nét nhân vật.
