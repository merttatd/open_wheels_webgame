# OpenWheels

Kurgusal takımlar, canlı yarış fiziği ve devam eden kariyer sezonları içeren, tarayıcıda çalışan 2D yarış oyunu. HTML, CSS, JavaScript ve SVG kullanır; kurulum, derleme veya sunucu tarafı gerektirmez.

## Başlatma

Depoyu indirin ve `index.html` dosyasını modern bir tarayıcıda açın. Tüm oyun kaynakları yereldir; oyun internet bağlantısı olmadan çalışır.

Geliştirme sırasında sabit bir yerel sunucu adresi önerilir. Python yüklüyse proje klasöründe:

```sh
python -m http.server 8080
```

Ardından `http://localhost:8080` adresini açın. Dosyadan açılan sürümün kayıtları ile localhost veya başka alan adındaki kayıtlar ayrıdır.

## Kontroller

| İşlem | Tuş |
| --- | --- |
| Gaz | Sağ ok / D |
| Fren | Sol ok / A |
| Şerit değiştirme | Yukarı-aşağı ok / W-S |
| ERS | E, basılı tut |
| Duraklat / devam | Boşluk |

Dokunmatik ekranlarda ekrandaki düğmeler kullanılır. Kırmızı ışıklar söndükten sonra hızlı tepki kalkış avantajı sağlar. Viraj göstergesi mesafeyi, yönü ve hedef hızı gösterir. Fren uyarısında hız azaltın.

## Oyun

- 11 takım, takım başına 2 pilot; 6 yedek takımla toplam 17 takım ve 34 pilot.
- Rastgele başlangıç gridi; gerçek yön değiştiren virajlar, pist kerbleri ve canlı minimap.
- Sollama, enerji yönetimi, hava koridoru ve temas davranışları olan rakipler.
- İlk 10 için canlı yarış sıralaması; hız, ERS ve viraj göstergeleri.
- 8 yarışlık sezonlar; yarış mesafeleri 8–12 km.
- İlk 10 puanı: **25, 18, 15, 12, 10, 8, 6, 4, 2, 1**. Takım puanı iki pilotun toplamıdır.
- Puan eşitliğinde galibiyet, ikincilik ve diğer sonuç sayıları karşılaştırılır. Tam eşitlikte sıralama tablosu ortak sıra gösterebilir; sezon geçişinde listenin son üç takımı kullanılır.
- Pilot ve takım podyumları, yarış galibi kutlaması, çarpışmasız mesafe koruyan finiş sonrası soğuma sürüşü.
- Son üç takım yedeğe düşer, yedeklerden rastgele üç takım yükselir. Yeni sezonda hız ve ivmelenme değerleri değişir.
- Sezon sayısına yapay sınır yoktur; geçmiş şampiyonlar saklanır. Kadro sezon boyunca sabittir.

Bu, gerçek F1 sezonunun birebir simülasyonu değildir: sprint, sıralama turları, pit stop ve ağ üzerinden çok oyunculu mod bulunmaz. Oyuncu finişinden 90 saniye sonra bitiremeyen rakipler DNF sayılır.

## Kayıtlar

Kariyer, kadro ve sezon ilerlemesi tarayıcının `localStorage` alanında saklanır. Tarayıcı verilerini temizlemek veya farklı bir adres/tarayıcı kullanmak mevcut kaydı erişilemez yapabilir. Bulut senkronizasyonu ve kayıt dışa aktarma henüz yoktur. GitHub deposuna oyuncu kayıtları eklenmez.

## Dosyalar

| Dosya | Görev |
| --- | --- |
| `index.html` | Oyun arayüzü, SVG araç ve script yükleme sırası |
| `styles.css` | Masaüstü ve mobil görünüm |
| `game.js` | Ana döngü, kontroller, kamera, HUD ve minimap |
| `race-track.js` | Yol geometrisi |
| `race-physics.js` | Hız, hava koridoru, ERS, yol tutuşu |
| `race-behaviour.js` | Rakip sürüş ve sollama kararları |
| `race-learning.js` | Yerel pilot modelleri ve öğrenen taktik seçimi |
| `race-collisions.js` | Temas ve zincirleme çarpışmalar |
| `race-cooldown.js` | Finiş sonrası takip ve yavaşlama |
| `race-roster.js` | Takım ve pilot kataloğu |
| `race-drivers.js` | Aktif pilot listesi |
| `roster-panel.js` | Kadro garajı arayüzü |
| `race-league.js` | Yarış sonuçları ve sezon puanları |
| `race-career.js` | Sezon devamı, yükselme/düşme, performans ve podyum |
| `assets/teams/*.svg` | 17 takım amblemi |

Takım ve pilotları `race-roster.js`, sezon performans modelini `race-career.js`, sürüş davranışını `race-behaviour.js` üzerinden düzenleyebilirsiniz. Script yükleme sırasını koruyun.

## GitHub'a yükleme

Bu klasörün **tüm içeriğini**, `assets/teams/` klasör yapısını koruyarak yükleyin. `.gitignore` dosyasını da ekleyin. `backup-*`, eski `.webp` logoları, yerel test çıktıları ve ZIP dosyaları gerekli değildir.

Temiz dağıtım paketinde 12 JavaScript dosyası, `index.html`, `styles.css`, 17 SVG logo, bu README ve `.gitignore` bulunur. NPM bağımlılığı yoktur.

## Kontrol listesi

- Masaüstü ve telefon genişliklerinde pistin iki kenara ulaşması ve yatay taşma olmaması.
- Gaz/fren, viraj uyarısı, ERS ve dokunmatik kontroller.
- 22 araçlı grid, ilk 10 sıralaması ve hareketli minimap.
- Sezon kaydı, podyumlar, takım yükselme/düşmesi ve sonraki sezon.

Depoda otomatik test çalıştırıcısı yoktur; geliştirme kontrolleri tarayıcıda yapılmıştır.

## Lisans

Henüz bir açık kaynak lisansı seçilmemiştir. Depoyu GitHub'da paylaşmak tek başına kullanım veya yeniden dağıtım lisansı vermez. Yayınlamadan önce proje sahibi uygun lisansı belirlemelidir.
## Öğrenen rakipler

Rakip analizi panelinden öğrenmeyi açabilir/kapatabilir ve kariyer puanlarını silmeden modelleri sıfırlayabilirsiniz. Öğrenme varsayılan olarak açıktır. Ayarlar yarış sırasında kilitlenir.

- Gözlemler yarım saniye aralıklarla alınır: hız farkı, mesafe, enerji, şerit ve viraj yakınlığı. Klavye girdileri veya gelecekteki eylemler okunmaz.
- Her pilot için çevrimiçi lojistik regresyon modeli sonraki gözlemde şerit değişimini tahmin eder. Fren profili, viraja hedef hızın üzerinde girişlerin hareketli istatistiğidir.
- Her pilotun dört hamlesi için ayrı doğrusal ödül modeli vardır: takip, ERS biriktir, soldan atak, sağdan atak. Modeller bağlama göre kısa vadeli sonuç öğrenen epsilon-greedy contextual bandit yaklaşımıyla kullanılır.
- İlk sekiz sonuçta temel sollama tercihi ve sınırlı keşif kullanılır. Sonrasında uygun hamleler arasında %10 keşif yapılır. Güvensiz şeritler seçeneklere alınmaz.
- Dört saniyelik hamle sonucunda temiz geçiş ve beklenen hız farkının ötesindeki mesafe kazanımı ödüllendirilir; temas ve enerji tüketimi cezalandırılır. Bu kısa vadeli bir yaklaşım olup tüm yarış stratejisini çözmez.
- Güncellemeler yalnızca tamamlanan yarış sonunda yapılır. Yeniden başlatılan yarışın geçici örnekleri atılır. Son kayıtlı yarış kimlikleri mükerrer eğitimi engeller.
- Son gözlemler daha fazla ağırlık taşır. Modeller pilot koduna bağlı olduğu için takım değişiminde pilotun geçmişi korunur.
- Araç gücü, azami hız, ERS sınırları ve tepki süreleri öğrenme tarafından artırılmaz. Gözlenen fren riskine göre takip aralığı en fazla 7 metre genişletilebilir.
- Veriler yalnızca `openwheels-learning-v1` localStorage kaydında tutulur; sunucu, API, dış ML kütüphanesi veya ağ bağlantısı kullanılmaz. Ham yarış örnekleri kalıcı olarak kaydedilmez.
- Paneldeki veri düzeyi istatistik miktarını belirtir; kalibre edilmiş güven olasılığı değildir. Farklı taktiklerin ortalama sonuçları gözlemseldir, eşit koşullu bir başarı garantisi değildir.

Öğrenmenin gerçekten daha iyi yarış sonuçları üretip üretmediği uzun dönem denge testleriyle değerlendirilmelidir. Sistem öğrenir; her yarışta mutlaka güçleneceği garanti edilmez.