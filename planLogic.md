===== PLAN LOGIC ỨNG DỤNG BACCARAT =====

1. Tại D:\ProjectDuong\Baccaat\src\UI_Vao_Phong_Choi.js 
- Sau khi bấm button "Bắt đầu " thì sẽ vào phòng từ 1-9 ưu tiên từ bé đến lớn.

2. sau khi click vào phòng. 
- sẽ  Kiểm tra    xem có đúng đã vào phòng chưa bằng ảnh Exit_Room,
dùm name "Exit_Room" truyền vào để tìm,
info = await window.getImageInfo("Exit_Room"),  
có thông tin x y width height rồi thì đi xác thực bằng Fc_checkOnceResult truyền info vô.

3. nếu xác định thành công 
- thì bắt đầu thực hiện logic :Kích hoạt lấy kết quả  List
đang làm tạm thời nhưu này :

await window.KicHoat_LayKetQua_Fill_TabeList();  bên UI_KetQuaList.js sẽ được kích hoạt doFetch()


sau đó state  KetQuaListTable có dạng  ["KetQua_Player", "KetQua_Banker", "KetQua_Tie"]

4.  Lấy KetQuaListTable = []; check xem thoả mãn điều kiện cháy ngầm 2 hay chưa ?
dùm hàm D:\ProjectDuong\Baccaat\src\util\CheckChay2Ngam.js để check 

