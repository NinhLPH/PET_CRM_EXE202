import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('e2e-artifacts');
const folders = readdirSync(root).filter(name => existsSync(resolve(root, name, 'fixtures.json'))).sort();
const folder = process.argv[2] || folders.at(-1);
if (!folder) throw new Error('Run npm run test:e2e first');
const dir = resolve(root, folder);
const network = readFileSync(resolve(dir, 'network.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
const operations = JSON.parse(readFileSync(resolve(dir, 'operations.json'), 'utf8'));
const results = JSON.parse(readFileSync('test-results/results.json', 'utf8'));
const rows = [];
function collect(suite) {
  for (const spec of suite.specs || []) {
    for (const test of spec.tests) rows.push(`| ${spec.title} | ${test.status === 'expected' ? 'Pass' : test.status === 'skipped' ? 'Blocked' : 'Fail'} | ${Math.round(test.results.reduce((sum, r) => sum + r.duration, 0) / 1000)}s |`);
  }
  for (const child of suite.suites || []) collect(child);
}
results.suites.forEach(collect);
const staticOperations = new Set(operations.filter(operation => !operation.includes('{')));
const coverage = operations.map(operation => {
  const [method, path] = operation.split(' ');
  const pattern = new RegExp(`^${path.replace(/\{[^}]+\}/g, '[^/]+')}$`);
  const matches = network.filter(r => r.scenario !== 'cleanup' && r.method === method && pattern.test(r.path)
    && (!staticOperations.has(`${method} ${r.path}`) || r.path === path));
  const sources = [...new Set(matches.map(r => r.source))].sort().join(', ') || 'Blocked';
  const cases = [...new Set(matches.map(r => r.scenario.split(' ')[0]))].sort().join(', ');
  const statuses = [...new Set(matches.map(r => r.status))].sort().join(', ');
  return `| ${operation} | ${sources} | ${cases || '—'} | ${statuses || '—'} |`;
});
const fixtures = folders.map(name => {
  const f = JSON.parse(readFileSync(resolve(root, name, 'fixtures.json'), 'utf8'));
  const deleted = new Set(f.deleted);
  return `| ${name} | ${f.customers.filter(id => !deleted.has(`customer ${id}`)).join(', ') || '—'} | ${f.pets.filter(id => !deleted.has(`pet ${id}`)).join(', ') || '—'} | ${f.services.join(', ') || '—'} | ${f.bookings.join(', ') || '—'} | ${f.reminders.join(', ') || '—'} |`;
});
const text = `# FE–API v1: Báo cáo kiểm thử

## Kết quả

- Thời điểm chạy: ${results.stats.startTime}.
- Chạy trên FE http://localhost:5173, API http://localhost:3000 và database hiện tại; Chromium headless, desktop 1440×900, mobile 390×844.
- Lượt cuối: **${results.stats.expected} pass, ${results.stats.unexpected} fail, ${results.stats.skipped} skipped**; thời gian ${Math.round(results.stats.duration / 1000)} giây.
- Run ID bằng chứng chính: ${folder}. Happy path gọi API/database thật; lỗi mạng/HTML/5xx và mất phản hồi được chủ động mô phỏng trong những ca có tên tương ứng.
- Test chạy tuần tự, retries=0. Hai Customer fixture riêng và Admin cấu hình local. Không reset/seed database.

| Nhóm ca | Kết quả | Thời gian |
|---|---|---|
${rows.join('\n')}

## Lỗi và sửa đổi

1. **Backend 500 khi tạo CRM/đăng ký và các thao tác dùng khóa giao dịch:** Prisma không deserialize được kết quả PostgreSQL kiểu void của pg_advisory_xact_lock. Đổi truy vấn khóa từ $queryRaw sang $executeRaw, vẫn parameterized và cùng transaction. Tái hiện trực tiếp trước sửa; các luồng tạo/chỉnh sửa chạy trên database thật sau sửa.
2. **Mất form sau reload rồi PRICE_CHANGED:** khôi phục pet, service, thời gian Việt Nam và ghi chú từ request đang chờ; bắt buộc xác nhận giá mới bằng state riêng trước gửi lại.
3. **Lịch sử chỉ hiện 5 mục sau trang chủ:** bổ sung limit vào query key để trang chủ (5) và lịch sử (20) có cache riêng. Kiểm tra với 21 bookings thật.
4. **HTML HTTP 200 bị coi là lưu thành công:** client từ chối JSON không hợp lệ, chuẩn hóa lỗi đọc response/mạng và timeout 30 giây; form được giữ để thử lại.
5. **Booking chờ gửi còn tồn tại sau đăng xuất:** xóa dữ liệu khi logout/login/hết phiên; kiểm tra chủ sở hữu fixture khi khôi phục; thông báo nếu trình duyệt từ chối sessionStorage.
6. **Cache CRM chưa bị invalidated sau chốt lịch/liên hệ:** cập nhật cả nhóm query customer detail/pets/activities, ngoài danh sách customers.
7. **Mất phản hồi khi chốt lịch:** đọc lại trạng thái và dữ liệu liên quan sau lỗi không xác định kết quả, tránh tiếp tục hiển thị form chốt khi backend đã hoàn thành.
8. **Giá lịch gần đây trên trang chủ:** dùng giá cuối cho booking COMPLETED, thống nhất với lịch sử và chi tiết.
9. **Xóa pet đã có ghi chú CRM:** kiểm tra phụ thuộc activity và trả 409 thay vì để lỗi khóa ngoại thành 500; giữ lịch sử CRM.

Lượt baseline ghi nhận 10/15 nhóm pass, 4 lỗi FE tái hiện và 1 lỗi đồng bộ chờ chuyển trang trong test. Lỗi test được sửa bằng chờ URL đích trước thao tác tiếp. Backend 500 được phát hiện và sửa trước baseline này.

## Đối chiếu 45 operation

UI = request do trình duyệt từ giao diện; API = request trực tiếp trong test để chuẩn bị fixture/kiểm tra ràng buộc. setup gồm đăng ký/đăng nhập qua UI và chuẩn bị dữ liệu. HTTP 4xx có chủ đích là kết quả đúng của ca âm; 500 ở ca 12 là fault injection. Bảng không tính request cleanup. Việc operation có request không thay thế kết quả assertion ở bảng ca phía trên.

| Operation | Cách kiểm tra | Ca | HTTP quan sát |
|---|---|---|---|
${coverage.join('\n')}

## Dữ liệu và bằng chứng

- [HTML report](../apps/web/playwright-report/index.html), JSON kết quả: apps/web/test-results/results.json.
- Mỗi thư mục apps/web/e2e-artifacts/<runId> giữ fixtures.json, network.jsonl, operations.json và screenshot. Chỉ ghi method/path/status; không ghi mật khẩu, token, cookie, request body hoặc raw trace/HAR. Artifacts bị gitignore, không được commit.
- Chỉ reminder thuộc ID và Customer có tiền tố runId được điều chỉnh reminder_date để test đến hạn; danh sách thao tác có trong fixtures.json. Không sửa đồng hồ server hoặc dữ liệu người dùng có sẵn.
- Cleanup hủy booking test còn PENDING/CONFIRMED, ngừng bán dịch vụ test, xóa pet/CRM tạm khi API cho phép. Giữ tài khoản, booking đã hoàn thành, reminder và lịch sử liên quan vì v1 không có API xóa an toàn các lịch sử này.
- Bảng dưới gồm cả các lượt dò lỗi/hồi quy đã chạy; ID pet/khách đã xóa được loại ra. Giá trong fixture dịch vụ đã ngừng bán không được dùng cho nghiệp vụ thật.

| Run | Customer còn lưu | Pet còn lưu | Service (ngừng bán) | Booking | Reminder |
|---|---|---|---|---|---|
${fixtures.join('\n')}

## Giới hạn

- Kiểm tra Chromium và hai viewport/múi giờ; chưa chứng nhận Firefox/WebKit, thiết bị vật lý, tải cao hay môi trường production/HTTPS.
- API v1 chỉ liệt kê khoảng giá ACTIVE: tắt rule được test qua UI, bật lại qua API trực tiếp; không tự bổ sung màn v2.
- Test v1 ghi nhận liên hệ PHONE/ZALO/OTHER trên dữ liệu giả lập; không gọi điện hoặc gửi tin thật.
- Pet v1 không có ngày sinh; kiểm tra ngày áp dụng cho booking/reminder theo contract hiện có.
`;
writeFileSync('../../docs/FE_API_V1_TEST_REPORT.md', text);
console.log('Report written: ' + rows.length + ' scenarios; ' + coverage.length + ' operations; run ' + folder);
