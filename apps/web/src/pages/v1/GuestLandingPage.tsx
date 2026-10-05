import {useRef, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link} from 'react-router-dom';
import {
    ArrowDown,
    ArrowRight,
    CalendarCheck,
    ChevronDown,
    Clock3,
    Heart,
    Menu,
    PawPrint,
    Scale,
    Scissors,
    X
} from 'lucide-react';
import {api} from '../../api/endpoints';
import {useAuth} from '../../app/authContext';
import {Empty, QueryState} from '../../app/ui';
import hero from '../../assets/guest-hero.webp';
import heroSmall from '../../assets/guest-hero-small.webp';
import './GuestLandingPage.css';

const navigation = [
    {href: '#dich-vu', label: 'Dịch vụ'},
    {href: '#cach-dat-lich', label: 'Cách đặt lịch'},
    {href: '#cau-hoi', label: 'Câu hỏi thường gặp'},
];

const benefits = [
    {
        icon: PawPrint,
        title: 'Mỗi bé, một hồ sơ riêng',
        text: 'Lưu thông tin, cân nặng và những lưu ý để chuẩn bị cho lần chăm sóc tiếp theo.'
    },
    {
        icon: Scale,
        title: 'Xem giá trước khi đặt',
        text: 'Giá tạm tính theo dịch vụ, loài và cân nặng của bé, ngay trong bước đặt lịch.'
    },
    {
        icon: CalendarCheck,
        title: 'Lịch hẹn trong tầm tay',
        text: 'Theo dõi trạng thái xác nhận và xem lại các lần sử dụng dịch vụ của bé.'
    },
];

const steps = [
    {
        title: 'Làm quen với bé',
        text: 'Đăng nhập hoặc tạo tài khoản, rồi thêm hồ sơ với thông tin và cân nặng của thú cưng.'
    },
    {
        title: 'Chọn lần chăm sóc tiếp theo',
        text: 'Chọn bé, dịch vụ và ngày giờ bạn mong muốn. Thêm ghi chú nếu bé có điều cần lưu ý.'
    },
    {
        title: 'Xem giá, gửi yêu cầu',
        text: 'Kiểm tra giá tạm tính rồi gửi yêu cầu đặt lịch. Cửa hàng sẽ xác nhận lịch sau.'
    },
];

const questions = [
    {
        question: 'Tôi có cần tài khoản để đặt lịch không?',
        answer: 'Có. Bạn cần đăng nhập để tạo hồ sơ thú cưng, gửi yêu cầu đặt lịch và theo dõi lịch hẹn. Bạn vẫn có thể xem các dịch vụ tại đây trước khi tạo tài khoản.'
    },
    {
        question: 'Tôi cần chuẩn bị thông tin gì cho bé?',
        answer: 'Hãy chuẩn bị tên, loài và cân nặng hiện tại của bé. Bạn cũng có thể bổ sung giống, lưu ý dị ứng và ghi chú đặc biệt trong hồ sơ thú cưng.'
    },
    {
        question: 'Giá dịch vụ được tính như thế nào?',
        answer: 'Giá tạm tính phụ thuộc vào dịch vụ, loài và cân nặng của thú cưng theo bảng giá đang áp dụng. Bạn sẽ xem được báo giá trong bước đặt lịch. Chi phí cuối cùng được cập nhật khi dịch vụ hoàn thành.'
    },
    {
        question: 'Làm sao biết lịch hẹn đã được xác nhận?',
        answer: 'Sau khi gửi yêu cầu, lịch hẹn ở trạng thái chờ duyệt. Đăng nhập và mở mục Lịch hẹn để theo dõi trạng thái xác nhận cũng như xem chi tiết lịch của bé.'
    },
];

function Brand() {
    return <Link to="/" className="guest-brand" aria-label="TailUp — Trang chủ"><PawPrint size={24} strokeWidth={1.7}
                                                                                          aria-hidden="true"/><span>TailUp<span
        className="guest-brand-dot">.</span></span></Link>;
}

function BookingLink({children = 'Đặt lịch chăm sóc'}: { children?: string }) {
    return <Link className="guest-button guest-button-primary" to="/app/bookings/new">{children}<ArrowRight size={18}
                                                                                                            aria-hidden="true"/></Link>;
}

function GuestServices() {
    const services = useQuery({queryKey: ['services', 1], queryFn: ({signal}) => api.services.list(1, 20, signal)});
    return <QueryState loading={services.isLoading} error={services.error} retry={() => void services.refetch()}>
        {services.data?.items.length ?
            <div className="guest-service-grid">{services.data.items.map(service => <article className="guest-service"
                                                                                             key={service.id}>
                <div className="guest-service-icon"><Scissors size={20} strokeWidth={1.7} aria-hidden="true"/></div>
                <h3>{service.serviceName}</h3>
                <p>{service.description || 'Giá được báo theo thú cưng và cân nặng khi đặt lịch.'}</p>
                {service.estimatedDuration != null &&
                    <div className="guest-duration"><Clock3 size={16} aria-hidden="true"/>Thời lượng dự
                        kiến: {service.estimatedDuration} phút</div>}
            </article>)}</div> : <Empty>Chưa có dịch vụ đang mở bán. Bạn hãy quay lại sau nhé.</Empty>}
    </QueryState>;
}

export function GuestLandingPage() {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuButton = useRef<HTMLButtonElement>(null);
    const {state} = useAuth();

    return <div className="guest-landing">
        <a href="#guest-main" className="guest-skip">Đến nội dung chính</a>
        <header className="guest-header" onKeyDown={event => {
            if (event.key === 'Escape' && menuOpen) {
                setMenuOpen(false);
                menuButton.current?.focus();
            }
        }}>
            <div className="guest-container guest-header-row">
                <Brand/>
                <nav className="guest-desktop-nav" aria-label="Điều hướng chính">
                    {navigation.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}
                </nav>
                <div className="guest-desktop-auth"><Link to="/login" className="guest-text-link">Đăng nhập</Link><Link
                    to="/register" className="guest-button guest-button-outline">Đăng ký</Link></div>
                <button ref={menuButton} type="button" className="guest-menu-button"
                        aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={menuOpen}
                        aria-controls="guest-mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>
                    {menuOpen ? <X size={20} aria-hidden="true"/> : <Menu size={20} aria-hidden="true"/>}
                </button>
            </div>
            <nav id="guest-mobile-menu" className="guest-mobile-nav guest-container"
                 aria-label="Điều hướng trên điện thoại" hidden={!menuOpen}>
                {navigation.map(item => <a key={item.href} href={item.href}
                                           onClick={() => setMenuOpen(false)}>{item.label}</a>)}
                <div className="guest-mobile-auth"><Link to="/login" className="guest-text-link">Đăng nhập</Link><Link
                    to="/register" className="guest-button guest-button-outline">Đăng ký</Link></div>
            </nav>
        </header>

        <main id="guest-main" tabIndex={-1}>
            <section className="guest-container guest-hero" aria-labelledby="guest-heading">
                <div className="guest-hero-copy">
                    <p className="guest-eyebrow">MỘT CHÚT CHĂM SÓC, THẬT
                        NHIỀU YÊU THƯƠNG</p>
                    <h1 id="guest-heading">Chăm chút mỗi ngày,<br/><span>yêu thương trọn vẹn.</span></h1>
                    <p className="guest-intro">Một lần tắm thơm, một bộ lông gọn gàng. Cùng TailUp chuẩn bị những buổi
                        grooming cho bé — từ chọn dịch vụ, xem giá đến đặt lịch.</p>
                    <div className="guest-hero-actions"><BookingLink/><a href="#dich-vu"
                                                                         className="guest-button guest-button-quiet">Khám
                        phá dịch vụ<ArrowDown size={17} aria-hidden="true"/></a></div>
                    <p className="guest-hero-note"><PawPrint size={17} aria-hidden="true"/> Cho những người bạn nhỏ, và
                        người thương các bé.</p>
                </div>
                <figure className="guest-hero-figure">
                    <img src={hero} srcSet={`${heroSmall} 640w, ${hero} 1280w`}
                         sizes="(min-width: 1200px) 520px, (min-width: 768px) 45vw, calc(100vw - 40px)" width={1280}
                         height={1280} fetchPriority="high"
                         alt="Chó Golden Retriever và mèo ngồi cạnh nhau trên khăn hồng phấn, xanh sage trong ánh sáng dịu nhẹ."/>
                    <figcaption><Heart size={18} aria-hidden="true"/><span>Những điều nhỏ bé.<br/><strong>Một tình yêu thật lớn.</strong></span><PawPrint
                        className="guest-caption-paw" size={20} aria-hidden="true"/></figcaption>
                </figure>
            </section>

            <section className="guest-benefits" aria-label="Cùng bạn chăm sóc thú cưng">
                <div className="guest-container guest-benefit-grid">{benefits.map(({icon: Icon, title, text}) => <div
                    className="guest-benefit" key={title}><Icon size={20} strokeWidth={1.7} aria-hidden="true"/>
                    <div><h2>{title}</h2><p>{text}</p></div>
                </div>)}</div>
            </section>

            <section id="dich-vu" className="guest-container guest-section" aria-labelledby="guest-services-title">
                <div className="guest-section-heading">
                    <div><p className="guest-eyebrow">DỊCH VỤ CHO BÉ</p><h2 id="guest-services-title">Thêm một chút
                        xinh,<br/>thêm một chút yêu.</h2></div>
                    <p>Chọn một lần chăm sóc phù hợp với bé.<br/>Giá được báo theo thú cưng và cân nặng khi đặt lịch.
                    </p></div>
                {/* Rebind the service view after the existing session probe clears its query cache. */}
                <div className="guest-services-state"><GuestServices key={state.status}/></div>
            </section>

            <section id="cach-dat-lich" className="guest-process" aria-labelledby="guest-process-title">
                <div className="guest-container guest-section">
                    <div className="guest-section-heading">
                        <div><p className="guest-eyebrow">ĐẶT LỊCH THẬT GỌN</p><h2 id="guest-process-title">Bạn chọn
                            lịch.<br/>Bé sẵn sàng được chăm chút.</h2></div>
                        <p>Từ hồ sơ của bé đến một lịch hẹn mới,<br/>chỉ qua ba bước đơn giản.</p></div>
                    <ol className="guest-steps">{steps.map((step, index) => <li key={step.title}><span
                        className="guest-step-number" aria-hidden="true">0{index + 1}</span><h3>{step.title}</h3>
                        <p>{step.text}</p></li>)}</ol>
                    <BookingLink/>
                </div>
            </section>

            <section id="cau-hoi" className="guest-container guest-section guest-faq" aria-labelledby="guest-faq-title">
                <div><p className="guest-eyebrow">MÌNH GIẢI ĐÁP NHÉ</p><h2 id="guest-faq-title">Một vài điều<br/>bạn có
                    thể muốn biết.</h2><p className="guest-faq-intro">Để lần đặt lịch đầu tiên của bạn và bé dễ dàng
                    hơn.</p></div>
                <div className="guest-questions">{questions.map(item => <details key={item.question}>
                    <summary>{item.question}<ChevronDown size={18} aria-hidden="true"/></summary>
                    <p>{item.answer}</p></details>)}</div>
            </section>

            <section className="guest-closing" aria-labelledby="guest-closing-title">
                <div className="guest-container guest-closing-inner">
                    <div><p className="guest-eyebrow"><PawPrint size={18} aria-hidden="true"/> HẸN BÉ MỘT NGÀY THẬT XINH
                    </p><h2 id="guest-closing-title">Lần chăm sóc tiếp theo,<br/>bắt đầu từ đây.</h2><p>Tạo hồ sơ cho bé
                        và chọn ngày giờ bạn mong muốn.</p></div>
                    <div className="guest-closing-actions"><BookingLink/><Link to="/register"
                                                                               className="guest-text-link">Chưa có tài
                        khoản? Đăng ký</Link></div>
                </div>
            </section>
        </main>

        <footer className="guest-container guest-footer">
            <div><Brand/><p>Chăm chút mỗi ngày, yêu thương trọn vẹn.</p></div>
            <nav aria-label="Liên kết cuối trang"><a href="#dich-vu">Dịch vụ</a><Link to="/login">Đăng nhập</Link><Link
                to="/register">Đăng ký</Link></nav>
            <span className="guest-footer-note">TailUp · Dành cho bạn và bé</span></footer>
    </div>;
}
