-- iZone — reference data required for the site to work.
-- No stock, shops, buying prices or reviews are created: those are business data
-- entered by the owner from the dashboard.

-- Currencies. Rates are placeholders until the owner confirms them in the
-- dashboard (confirmed_at stays null and the dashboard shows a warning).
insert into public.currencies (code, name, symbol, decimals, round_to, rate, confirmed_at) values
  ('EUR', 'Euro', '€', 2, 5, 1, now()),
  ('PLN', 'Polish złoty', 'zł', 2, 10, 4.25, null),
  ('DZD', 'Algerian dinar', 'DA', 0, 500, 150, null)
on conflict (code) do nothing;

insert into public.site_settings (id, main_currency) values (1, 'EUR') on conflict (id) do nothing;

-- iPhone models, oldest to newest. Storage in GB (1024 = 1TB).
insert into public.iphone_models (slug, name, release_year, sort_order, storages, colors, is_active) values
  ('iphone-x',          'iPhone X',                    2017, 10,  '{64,256}',            '{"Silver","Space Grey"}', true),
  ('iphone-xr',         'iPhone XR',                   2018, 20,  '{64,128,256}',        '{"Black","White","Blue","Yellow","Coral","(PRODUCT)RED"}', true),
  ('iphone-xs',         'iPhone XS',                   2018, 30,  '{64,256,512}',        '{"Silver","Space Grey","Gold"}', true),
  ('iphone-xs-max',     'iPhone XS Max',               2018, 40,  '{64,256,512}',        '{"Silver","Space Grey","Gold"}', true),
  ('iphone-11',         'iPhone 11',                   2019, 50,  '{64,128,256}',        '{"Black","White","Green","Yellow","Purple","(PRODUCT)RED"}', true),
  ('iphone-11-pro',     'iPhone 11 Pro',               2019, 60,  '{64,256,512}',        '{"Midnight Green","Space Grey","Silver","Gold"}', true),
  ('iphone-11-pro-max', 'iPhone 11 Pro Max',           2019, 70,  '{64,256,512}',        '{"Midnight Green","Space Grey","Silver","Gold"}', true),
  ('iphone-se-2',       'iPhone SE (2nd generation)',  2020, 80,  '{64,128,256}',        '{"Black","White","(PRODUCT)RED"}', true),
  ('iphone-12-mini',    'iPhone 12 mini',              2020, 90,  '{64,128,256}',        '{"Black","White","Blue","Green","Purple","(PRODUCT)RED"}', true),
  ('iphone-12',         'iPhone 12',                   2020, 100, '{64,128,256}',        '{"Black","White","Blue","Green","Purple","(PRODUCT)RED"}', true),
  ('iphone-12-pro',     'iPhone 12 Pro',               2020, 110, '{128,256,512}',       '{"Graphite","Silver","Gold","Pacific Blue"}', true),
  ('iphone-12-pro-max', 'iPhone 12 Pro Max',           2020, 120, '{128,256,512}',       '{"Graphite","Silver","Gold","Pacific Blue"}', true),
  ('iphone-13-mini',    'iPhone 13 mini',              2021, 130, '{128,256,512}',       '{"Midnight","Starlight","Blue","Pink","Green","(PRODUCT)RED"}', true),
  ('iphone-13',         'iPhone 13',                   2021, 140, '{128,256,512}',       '{"Midnight","Starlight","Blue","Pink","Green","(PRODUCT)RED"}', true),
  ('iphone-13-pro',     'iPhone 13 Pro',               2021, 150, '{128,256,512,1024}',  '{"Graphite","Gold","Silver","Sierra Blue","Alpine Green"}', true),
  ('iphone-13-pro-max', 'iPhone 13 Pro Max',           2021, 160, '{128,256,512,1024}',  '{"Graphite","Gold","Silver","Sierra Blue","Alpine Green"}', true),
  ('iphone-se-3',       'iPhone SE (3rd generation)',  2022, 170, '{64,128,256}',        '{"Midnight","Starlight","(PRODUCT)RED"}', true),
  ('iphone-14',         'iPhone 14',                   2022, 180, '{128,256,512}',       '{"Midnight","Starlight","Blue","Purple","Yellow","(PRODUCT)RED"}', true),
  ('iphone-14-plus',    'iPhone 14 Plus',              2022, 190, '{128,256,512}',       '{"Midnight","Starlight","Blue","Purple","Yellow","(PRODUCT)RED"}', true),
  ('iphone-14-pro',     'iPhone 14 Pro',               2022, 200, '{128,256,512,1024}',  '{"Space Black","Silver","Gold","Deep Purple"}', true),
  ('iphone-14-pro-max', 'iPhone 14 Pro Max',           2022, 210, '{128,256,512,1024}',  '{"Space Black","Silver","Gold","Deep Purple"}', true),
  ('iphone-15',         'iPhone 15',                   2023, 220, '{128,256,512}',       '{"Black","Blue","Green","Yellow","Pink"}', true),
  ('iphone-15-plus',    'iPhone 15 Plus',              2023, 230, '{128,256,512}',       '{"Black","Blue","Green","Yellow","Pink"}', true),
  ('iphone-15-pro',     'iPhone 15 Pro',               2023, 240, '{128,256,512,1024}',  '{"Black Titanium","White Titanium","Blue Titanium","Natural Titanium"}', true),
  ('iphone-15-pro-max', 'iPhone 15 Pro Max',           2023, 250, '{256,512,1024}',      '{"Black Titanium","White Titanium","Blue Titanium","Natural Titanium"}', true),
  ('iphone-16',         'iPhone 16',                   2024, 260, '{128,256,512}',       '{"Black","White","Pink","Teal","Ultramarine"}', true),
  ('iphone-16-plus',    'iPhone 16 Plus',              2024, 270, '{128,256,512}',       '{"Black","White","Pink","Teal","Ultramarine"}', true),
  ('iphone-16-pro',     'iPhone 16 Pro',               2024, 280, '{128,256,512,1024}',  '{"Black Titanium","White Titanium","Natural Titanium","Desert Titanium"}', true),
  ('iphone-16-pro-max', 'iPhone 16 Pro Max',           2024, 290, '{256,512,1024}',      '{"Black Titanium","White Titanium","Natural Titanium","Desert Titanium"}', true),
  ('iphone-16e',        'iPhone 16e',                  2025, 300, '{128,256,512}',       '{"Black","White"}', true),
  ('iphone-17',         'iPhone 17',                   2025, 310, '{256,512}',           '{"Black","White","Mist Blue","Sage","Lavender"}', true),
  ('iphone-air',        'iPhone Air',                  2025, 320, '{256,512,1024}',      '{"Space Black","Cloud White","Light Gold","Sky Blue"}', true),
  ('iphone-17-pro',     'iPhone 17 Pro',               2025, 330, '{256,512,1024}',      '{"Silver","Cosmic Orange","Deep Blue"}', true),
  ('iphone-17-pro-max', 'iPhone 17 Pro Max',           2025, 340, '{256,512,1024,2048}', '{"Silver","Cosmic Orange","Deep Blue"}', true),
  ('iphone-17e',        'iPhone 17e',                  2026, 350, '{256,512}',           '{"Black","White"}', true),
  -- 2026 generation: verify storages/colours in the dashboard (Models) as Apple confirms them.
  ('iphone-18',         'iPhone 18',                   2027, 360, '{256,512}',           '{}', false),
  ('iphone-18-pro',     'iPhone 18 Pro',               2026, 370, '{256,512,1024}',      '{}', true),
  ('iphone-18-pro-max', 'iPhone 18 Pro Max',           2026, 380, '{256,512,1024,2048}', '{}', true)
on conflict (slug) do nothing;

-- Default deductions (percent of the base buying price). Fully editable.
insert into public.trade_in_rules (key, category, label, deduction_type, value, sort_order) values
  ('condition_like_new',  'condition', 'Like new',               'percent', 0,  10),
  ('condition_excellent', 'condition', 'Excellent',              'percent', 5,  20),
  ('condition_good',      'condition', 'Good',                   'percent', 12, 30),
  ('condition_fair',      'condition', 'Fair',                   'percent', 25, 40),
  ('condition_damaged',   'condition', 'Damaged',                'percent', 45, 50),
  ('defect_face_id',      'defect',    'Face ID not working',    'percent', 15, 110),
  ('defect_cameras',      'defect',    'Camera not working',     'percent', 15, 120),
  ('defect_screen',       'defect',    'Screen display faulty',  'percent', 25, 130),
  ('defect_touchscreen',  'defect',    'Touchscreen faulty',     'percent', 25, 140),
  ('defect_speakers',     'defect',    'Speaker not working',    'percent', 5,  150),
  ('defect_microphone',   'defect',    'Microphone not working', 'percent', 5,  160),
  ('defect_charging',     'defect',    'Charging not working',   'percent', 10, 170),
  ('defect_buttons',      'defect',    'Buttons not working',    'percent', 5,  180),
  ('defect_water_damage', 'defect',    'Water damage',           'percent', 40, 190),
  ('defect_other',        'defect',    'Other declared defects', 'percent', 0,  200),
  ('part_screen',         'part',      'Screen replaced',        'percent', 15, 310),
  ('part_battery',        'part',      'Battery replaced',       'percent', 5,  320),
  ('part_cameras',        'part',      'Camera replaced',        'percent', 10, 330),
  ('part_other',          'part',      'Other parts replaced',   'percent', 5,  340)
on conflict (key) do nothing;

insert into public.battery_bands (min_pct, max_pct, deduction_type, value)
select * from (values (90, 100, 'percent'::public.deduction_type, 0::numeric), (85, 89, 'percent', 5), (80, 84, 'percent', 10), (0, 79, 'percent', 20)) v
where not exists (select 1 from public.battery_bands);

-- ---------------------------------------------------------------------------
-- FAQ (editable in the dashboard)
-- ---------------------------------------------------------------------------
insert into public.faqs (locale, sort_order, question, answer)
select * from (values
  ('en', 10, $t$How does selling my iPhone to iZone work?$t$, $t$Use our trade-in calculator to get an instant estimate, submit your enquiry, then bring your iPhone to the shop of your choice. We inspect it and confirm the final price.$t$),
  ('en', 20, $t$Is the online estimate guaranteed?$t$, $t$No. The estimate is based on the information you provide. The final purchase price is confirmed after a physical inspection of the device.$t$),
  ('en', 30, $t$What do I need to bring when I sell my iPhone?$t$, $t$Your iPhone, its charging cable if you have it, and a valid ID. Find My must be turned off and the device signed out of iCloud.$t$),
  ('en', 40, $t$Are your iPhones original?$t$, $t$We sell only original Apple iPhones. Every phone lists its battery health, condition and the status of its original parts.$t$),
  ('en', 50, $t$Can I reserve a phone?$t$, $t$Yes. Open the phone's page and choose "Reserve this phone". We will contact you to confirm the reservation.$t$),
  ('en', 60, $t$Can I pay online?$t$, $t$Not at the moment. Contact us on WhatsApp or visit one of our shops to complete your purchase.$t$),

  ('fr', 10, $t$Comment vendre mon iPhone à iZone ?$t$, $t$Utilisez notre calculateur de reprise pour obtenir une estimation immédiate, envoyez votre demande, puis apportez votre iPhone dans la boutique de votre choix. Nous l'inspectons et confirmons le prix final.$t$),
  ('fr', 20, $t$L'estimation en ligne est-elle garantie ?$t$, $t$Non. L'estimation repose sur les informations que vous fournissez. Le prix d'achat final est confirmé après une inspection physique de l'appareil.$t$),
  ('fr', 30, $t$Que dois-je apporter pour vendre mon iPhone ?$t$, $t$Votre iPhone, son câble de charge si vous l'avez, et une pièce d'identité valide. La fonction Localiser doit être désactivée et l'appareil déconnecté d'iCloud.$t$),
  ('fr', 40, $t$Vos iPhone sont-ils d'origine ?$t$, $t$Nous vendons uniquement des iPhone Apple d'origine. Chaque téléphone indique la santé de sa batterie, son état et le statut de ses pièces d'origine.$t$),
  ('fr', 50, $t$Puis-je réserver un téléphone ?$t$, $t$Oui. Ouvrez la page du téléphone et choisissez « Réserver ce téléphone ». Nous vous contacterons pour confirmer la réservation.$t$),
  ('fr', 60, $t$Puis-je payer en ligne ?$t$, $t$Pas pour le moment. Contactez-nous sur WhatsApp ou rendez-vous dans l'une de nos boutiques pour finaliser votre achat.$t$),

  ('ar', 10, $t$كيف أبيع هاتف iPhone الخاص بي إلى iZone؟$t$, $t$استخدم حاسبة الاستبدال للحصول على تقدير فوري، ثم أرسل طلبك واحضر هاتفك إلى المتجر الذي تختاره. نقوم بفحص الجهاز ونؤكد السعر النهائي.$t$),
  ('ar', 20, $t$هل التقدير عبر الإنترنت مضمون؟$t$, $t$لا. يعتمد التقدير على المعلومات التي تقدمها، ويتم تأكيد سعر الشراء النهائي بعد الفحص الفعلي للجهاز.$t$),
  ('ar', 30, $t$ماذا يجب أن أحضر عند بيع هاتفي؟$t$, $t$هاتف iPhone، وكابل الشحن إن وجد، وبطاقة هوية سارية. يجب إيقاف خاصية «تحديد الموقع» وتسجيل الخروج من iCloud.$t$),
  ('ar', 40, $t$هل هواتف iPhone لديكم أصلية؟$t$, $t$نبيع فقط هواتف iPhone الأصلية من Apple. نعرض لكل هاتف صحة البطارية والحالة وحالة القطع الأصلية.$t$),
  ('ar', 50, $t$هل يمكنني حجز هاتف؟$t$, $t$نعم. افتح صفحة الهاتف واختر «احجز هذا الهاتف»، وسنتواصل معك لتأكيد الحجز.$t$),
  ('ar', 60, $t$هل يمكنني الدفع عبر الإنترنت؟$t$, $t$ليس حاليًا. تواصل معنا عبر واتساب أو قم بزيارة أحد متاجرنا لإتمام عملية الشراء.$t$),

  ('pl', 10, $t$Jak sprzedać iPhone'a do iZone?$t$, $t$Skorzystaj z kalkulatora odkupu, aby od razu otrzymać wycenę, wyślij zgłoszenie i przynieś iPhone'a do wybranego sklepu. Sprawdzimy urządzenie i potwierdzimy ostateczną cenę.$t$),
  ('pl', 20, $t$Czy wycena online jest gwarantowana?$t$, $t$Nie. Wycena opiera się na podanych przez Ciebie informacjach. Ostateczna cena zakupu jest potwierdzana po fizycznym sprawdzeniu urządzenia.$t$),
  ('pl', 30, $t$Co muszę przynieść, sprzedając iPhone'a?$t$, $t$iPhone'a, kabel do ładowania, jeśli go masz, oraz ważny dokument tożsamości. Funkcja Znajdź musi być wyłączona, a urządzenie wylogowane z iCloud.$t$),
  ('pl', 40, $t$Czy wasze iPhone'y są oryginalne?$t$, $t$Sprzedajemy wyłącznie oryginalne iPhone'y Apple. Przy każdym telefonie podajemy kondycję baterii, stan oraz informację o oryginalnych częściach.$t$),
  ('pl', 50, $t$Czy mogę zarezerwować telefon?$t$, $t$Tak. Otwórz stronę telefonu i wybierz „Zarezerwuj ten telefon”. Skontaktujemy się z Tobą, aby potwierdzić rezerwację.$t$),
  ('pl', 60, $t$Czy mogę zapłacić online?$t$, $t$Obecnie nie. Skontaktuj się z nami przez WhatsApp lub odwiedź jeden z naszych sklepów, aby sfinalizować zakup.$t$)
) v (locale, sort_order, question, answer)
where not exists (select 1 from public.faqs);

-- ---------------------------------------------------------------------------
-- Legal pages (templates — review with a legal adviser; editable in the dashboard)
-- Body format: paragraphs separated by blank lines, "## " headings, "- " bullets.
-- ---------------------------------------------------------------------------
insert into public.pages (slug, locale, title, body) values
('privacy', 'en', 'Privacy policy', $t$## Who we are
iZone sells original Apple iPhones and buys used iPhones from customers through its physical shops. This policy explains how we handle the personal information you share with us on this website.

## Information we collect
- Your name and telephone number, and your email address if you provide it.
- Details about the iPhone you want to sell, including the photographs you upload.
- The messages you send us about a phone, a reservation or a trade-in.

## How we use it
We use this information only to answer your enquiries, prepare an offer for your device, manage reservations and complete purchases and sales. We do not sell your personal information.

## Storage and retention
Your information is stored securely and is only accessible to authorised iZone staff. We keep enquiries for as long as needed to handle them and to meet our legal and accounting obligations.

## Your rights
You can ask us to access, correct or delete your personal information at any time by contacting us by telephone, WhatsApp or in one of our shops.$t$),
('privacy', 'fr', 'Politique de confidentialité', $t$## Qui sommes-nous
iZone vend des iPhone Apple d'origine et rachète des iPhone d'occasion à ses clients dans ses boutiques physiques. Cette politique explique comment nous traitons les informations personnelles que vous nous transmettez sur ce site.

## Informations collectées
- Votre nom et votre numéro de téléphone, ainsi que votre adresse e-mail si vous la fournissez.
- Les détails de l'iPhone que vous souhaitez vendre, y compris les photos que vous envoyez.
- Les messages que vous nous adressez au sujet d'un téléphone, d'une réservation ou d'une reprise.

## Utilisation
Nous utilisons ces informations uniquement pour répondre à vos demandes, préparer une offre pour votre appareil, gérer les réservations et finaliser les achats et les ventes. Nous ne vendons jamais vos informations personnelles.

## Conservation
Vos informations sont stockées de manière sécurisée et ne sont accessibles qu'au personnel autorisé d'iZone. Nous conservons les demandes le temps nécessaire à leur traitement et au respect de nos obligations légales et comptables.

## Vos droits
Vous pouvez à tout moment demander l'accès, la rectification ou la suppression de vos informations personnelles en nous contactant par téléphone, sur WhatsApp ou en boutique.$t$),
('privacy', 'ar', 'سياسة الخصوصية', $t$## من نحن
تبيع iZone هواتف iPhone الأصلية من Apple وتشتري هواتف iPhone المستعملة من العملاء عبر متاجرها. توضح هذه السياسة كيفية تعاملنا مع المعلومات الشخصية التي تشاركها معنا على هذا الموقع.

## المعلومات التي نجمعها
- اسمك ورقم هاتفك، وبريدك الإلكتروني إذا قدمته.
- تفاصيل هاتف iPhone الذي تريد بيعه، بما في ذلك الصور التي ترفعها.
- الرسائل التي ترسلها إلينا بخصوص هاتف أو حجز أو عملية استبدال.

## كيف نستخدمها
نستخدم هذه المعلومات فقط للرد على استفساراتك، وإعداد عرض لجهازك، وإدارة الحجوزات، وإتمام عمليات الشراء والبيع. نحن لا نبيع معلوماتك الشخصية.

## التخزين والاحتفاظ
تُخزَّن معلوماتك بشكل آمن ولا يطّلع عليها إلا موظفو iZone المخوّلون. نحتفظ بالطلبات طوال المدة اللازمة لمعالجتها وللوفاء بالتزاماتنا القانونية والمحاسبية.

## حقوقك
يمكنك في أي وقت أن تطلب الاطلاع على معلوماتك الشخصية أو تصحيحها أو حذفها عبر التواصل معنا بالهاتف أو واتساب أو في أحد متاجرنا.$t$),
('privacy', 'pl', 'Polityka prywatności', $t$## Kim jesteśmy
iZone sprzedaje oryginalne iPhone'y Apple i odkupuje używane iPhone'y od klientów w swoich sklepach stacjonarnych. Niniejsza polityka wyjaśnia, jak postępujemy z danymi osobowymi przekazanymi nam za pośrednictwem tej strony.

## Jakie dane zbieramy
- Imię i nazwisko oraz numer telefonu, a także adres e-mail, jeśli go podasz.
- Informacje o iPhonie, który chcesz sprzedać, w tym przesłane zdjęcia.
- Wiadomości, które wysyłasz nam w sprawie telefonu, rezerwacji lub odkupu.

## Jak je wykorzystujemy
Wykorzystujemy te dane wyłącznie do odpowiadania na zapytania, przygotowania oferty za urządzenie, obsługi rezerwacji oraz realizacji zakupów i sprzedaży. Nie sprzedajemy Twoich danych osobowych.

## Przechowywanie
Twoje dane są przechowywane w bezpieczny sposób i dostępne wyłącznie dla upoważnionych pracowników iZone. Przechowujemy zgłoszenia tak długo, jak jest to potrzebne do ich obsługi i spełnienia obowiązków prawnych oraz księgowych.

## Twoje prawa
W każdej chwili możesz poprosić o dostęp do swoich danych, ich poprawienie lub usunięcie, kontaktując się z nami telefonicznie, przez WhatsApp lub w sklepie.$t$),

('terms', 'en', 'Terms and conditions', $t$## Products and prices
Prices are set in the currency of the shop that holds the phone. Prices shown in other currencies are converted with our current exchange rates and are for information only. Prices and availability may change without notice.

## Reservations and purchases
Online payment is not available. A reservation request is confirmed only after our team contacts you. Purchases are completed in our shops or after direct contact with our team.

## Product information
We describe every phone accurately, including battery health, condition and the status of its original parts. Photographs show the actual device unless stated otherwise.

## Warranty and returns
Warranty and return conditions are explained in the shop at the time of purchase.

## Contact
If you have any questions about these terms, please contact us.$t$),
('terms', 'fr', 'Conditions générales', $t$## Produits et prix
Les prix sont fixés dans la devise de la boutique qui détient le téléphone. Les prix affichés dans d'autres devises sont convertis avec nos taux de change actuels et sont donnés à titre indicatif. Les prix et la disponibilité peuvent changer sans préavis.

## Réservations et achats
Le paiement en ligne n'est pas disponible. Une demande de réservation n'est confirmée qu'après avoir été contacté par notre équipe. Les achats sont finalisés en boutique ou après contact direct avec notre équipe.

## Informations produit
Nous décrivons chaque téléphone avec précision, y compris la santé de la batterie, l'état et le statut des pièces d'origine. Les photos montrent l'appareil réel, sauf indication contraire.

## Garantie et retours
Les conditions de garantie et de retour sont expliquées en boutique au moment de l'achat.

## Contact
Pour toute question concernant ces conditions, contactez-nous.$t$),
('terms', 'ar', 'الشروط والأحكام', $t$## المنتجات والأسعار
تُحدَّد الأسعار بعملة المتجر الذي يوجد فيه الهاتف. الأسعار المعروضة بعملات أخرى محوّلة وفق أسعار الصرف الحالية لدينا وهي للعلم فقط. قد تتغير الأسعار والتوفر دون إشعار مسبق.

## الحجوزات والمشتريات
الدفع عبر الإنترنت غير متاح. لا يتم تأكيد طلب الحجز إلا بعد تواصل فريقنا معك. تتم عمليات الشراء في متاجرنا أو بعد التواصل المباشر مع فريقنا.

## معلومات المنتج
نصف كل هاتف بدقة، بما في ذلك صحة البطارية والحالة وحالة القطع الأصلية. تُظهر الصور الجهاز الفعلي ما لم يُذكر خلاف ذلك.

## الضمان والإرجاع
يتم توضيح شروط الضمان والإرجاع في المتجر عند الشراء.

## التواصل
إذا كانت لديك أي أسئلة حول هذه الشروط، يرجى التواصل معنا.$t$),
('terms', 'pl', 'Regulamin', $t$## Produkty i ceny
Ceny są ustalane w walucie sklepu, w którym znajduje się telefon. Ceny wyświetlane w innych walutach są przeliczane według naszych aktualnych kursów i mają charakter wyłącznie informacyjny. Ceny i dostępność mogą ulec zmianie bez uprzedzenia.

## Rezerwacje i zakupy
Płatność online nie jest dostępna. Prośba o rezerwację jest potwierdzana dopiero po kontakcie naszego zespołu. Zakupy finalizowane są w naszych sklepach lub po bezpośrednim kontakcie z naszym zespołem.

## Informacje o produktach
Każdy telefon opisujemy rzetelnie, w tym kondycję baterii, stan oraz informację o oryginalnych częściach. Zdjęcia przedstawiają rzeczywiste urządzenie, chyba że zaznaczono inaczej.

## Gwarancja i zwroty
Warunki gwarancji i zwrotów są wyjaśniane w sklepie w momencie zakupu.

## Kontakt
W razie pytań dotyczących regulaminu prosimy o kontakt.$t$),

('trade-in-conditions', 'en', 'Trade-in conditions', $t$## Estimates
The online estimate is calculated from the information you provide. It is not a binding offer. The final purchase price will be confirmed after physical inspection of the device.

## Requirements
- You must be the legal owner of the iPhone and present a valid ID.
- Find My must be turned off and the device signed out of iCloud.
- The device must not be reported lost or stolen, or be blocked by a network operator.

## Inspection
We check the condition, battery health, functionality and originality of the components. If the device does not match the information provided, we will propose an updated price, which you are free to accept or refuse.

## Your data
Please back up your data before visiting us. Every device we buy is fully erased.

## Payment
Payment is made in the shop once the final price has been accepted.$t$),
('trade-in-conditions', 'fr', 'Conditions de reprise', $t$## Estimations
L'estimation en ligne est calculée à partir des informations que vous fournissez. Il ne s'agit pas d'une offre ferme. Le prix d'achat final sera confirmé après inspection physique de l'appareil.

## Conditions
- Vous devez être le propriétaire légal de l'iPhone et présenter une pièce d'identité valide.
- La fonction Localiser doit être désactivée et l'appareil déconnecté d'iCloud.
- L'appareil ne doit pas être déclaré perdu ou volé, ni bloqué par un opérateur.

## Inspection
Nous vérifions l'état, la santé de la batterie, le fonctionnement et l'originalité des composants. Si l'appareil ne correspond pas aux informations fournies, nous vous proposerons un prix mis à jour, que vous êtes libre d'accepter ou de refuser.

## Vos données
Pensez à sauvegarder vos données avant votre visite. Chaque appareil racheté est entièrement effacé.

## Paiement
Le paiement est effectué en boutique une fois le prix final accepté.$t$),
('trade-in-conditions', 'ar', 'شروط الاستبدال', $t$## التقديرات
يتم حساب التقدير عبر الإنترنت بناءً على المعلومات التي تقدمها، وهو ليس عرضًا ملزمًا. سيتم تأكيد سعر الشراء النهائي بعد الفحص الفعلي للجهاز.

## المتطلبات
- يجب أن تكون المالك القانوني لهاتف iPhone وأن تقدم بطاقة هوية سارية.
- يجب إيقاف خاصية «تحديد الموقع» وتسجيل الخروج من iCloud.
- يجب ألا يكون الجهاز مُبلَّغًا عنه كمفقود أو مسروق، أو محظورًا من قبل مشغل الشبكة.

## الفحص
نتحقق من الحالة وصحة البطارية والأداء وأصالة المكونات. إذا لم يطابق الجهاز المعلومات المقدمة، سنقترح عليك سعرًا محدثًا ولك حرية قبوله أو رفضه.

## بياناتك
يرجى نسخ بياناتك احتياطيًا قبل زيارتنا. يتم مسح كل جهاز نشتريه بالكامل.

## الدفع
يتم الدفع في المتجر بعد قبول السعر النهائي.$t$),
('trade-in-conditions', 'pl', 'Warunki odkupu', $t$## Wyceny
Wycena online jest obliczana na podstawie podanych przez Ciebie informacji i nie stanowi wiążącej oferty. Ostateczna cena zakupu zostanie potwierdzona po fizycznym sprawdzeniu urządzenia.

## Wymagania
- Musisz być prawnym właścicielem iPhone'a i okazać ważny dokument tożsamości.
- Funkcja Znajdź musi być wyłączona, a urządzenie wylogowane z iCloud.
- Urządzenie nie może być zgłoszone jako zgubione lub skradzione ani zablokowane przez operatora.

## Sprawdzenie
Sprawdzamy stan, kondycję baterii, działanie oraz oryginalność podzespołów. Jeśli urządzenie nie odpowiada podanym informacjom, zaproponujemy zaktualizowaną cenę, którą możesz przyjąć lub odrzucić.

## Twoje dane
Przed wizytą wykonaj kopię zapasową danych. Każde odkupione urządzenie jest całkowicie wymazywane.

## Płatność
Płatność następuje w sklepie po zaakceptowaniu ostatecznej ceny.$t$)
on conflict (slug, locale) do nothing;
