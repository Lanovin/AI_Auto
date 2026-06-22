/* ===== AutoCeny – app.js ===== */
(function () {
    'use strict';

    // ---------- DOM references ----------
    const form = document.getElementById('carForm');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');
    const resultSection = document.getElementById('resultSection');
    const resultContent = document.getElementById('resultContent');
    const copyBtn = document.getElementById('copyBtn');
    const powerKwInput = document.getElementById('powerKw');
    const hpDisplay = document.getElementById('hpDisplay');
    const yearSelect = document.getElementById('year');
    const brandSelect = document.getElementById('brand');
    const modelSelect = document.getElementById('model');
    const vinInput = document.getElementById('vin');

    // ---------- Model database (last ~20 years per brand) ----------
    const MODEL_DB = {
        'Škoda': ['Citigo', 'Fabia', 'Fabia Combi', 'Rapid', 'Rapid Spaceback', 'Scala', 'Octavia', 'Octavia Combi', 'Octavia RS', 'Superb', 'Superb Combi', 'Roomster', 'Yeti', 'Kamiq', 'Karoq', 'Kodiaq', 'Enyaq iV', 'Enyaq Coupé iV', 'Praktik'],
        'VW': ['Up!', 'Polo', 'Golf', 'Golf Variant', 'Golf Sportsvan', 'Golf Plus', 'Jetta', 'Bora', 'Passat', 'Passat Variant', 'Passat CC', 'Arteon', 'Arteon Shooting Brake', 'Scirocco', 'Eos', 'Beetle', 'T-Roc', 'T-Cross', 'Taigo', 'Tiguan', 'Tiguan Allspace', 'Touareg', 'Touran', 'Sharan', 'Caddy', 'Multivan', 'Transporter', 'Amarok', 'ID.3', 'ID.4', 'ID.5', 'ID.7', 'ID. Buzz', 'Atlas', 'Fox'],
        'BMW': ['Řada 1', 'Řada 2', 'Řada 2 Active Tourer', 'Řada 2 Gran Coupé', 'Řada 3', 'Řada 3 Touring', 'Řada 3 GT', 'Řada 4', 'Řada 4 Gran Coupé', 'Řada 5', 'Řada 5 Touring', 'Řada 5 GT', 'Řada 6', 'Řada 6 GT', 'Řada 7', 'Řada 8', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'XM', 'Z4', 'i3', 'i4', 'i5', 'i7', 'iX', 'iX1', 'iX3', 'M2', 'M3', 'M4', 'M5', 'M8'],
        'Mercedes': ['A', 'B', 'C', 'C Coupé', 'CLA', 'CLA Shooting Brake', 'CLS', 'E', 'E Coupé', 'E Cabrio', 'S', 'S Coupé', 'GLA', 'GLB', 'GLC', 'GLC Coupé', 'GLE', 'GLE Coupé', 'GLS', 'G', 'SL', 'SLC/SLK', 'AMG GT', 'EQA', 'EQB', 'EQC', 'EQE', 'EQE SUV', 'EQS', 'EQS SUV', 'Citan', 'V/Viano', 'Vito', 'Sprinter'],
        'Audi': ['A1', 'A1 Sportback', 'A3', 'A3 Sportback', 'A3 Sedan', 'A4', 'A4 Avant', 'A4 Allroad', 'A5', 'A5 Sportback', 'A6', 'A6 Avant', 'A6 Allroad', 'A7 Sportback', 'A8', 'Q2', 'Q3', 'Q3 Sportback', 'Q4 e-tron', 'Q5', 'Q5 Sportback', 'Q7', 'Q8', 'Q8 e-tron', 'e-tron GT', 'TT', 'TT Roadster', 'R8', 'RS3', 'RS4', 'RS5', 'RS6', 'RS7', 'RS Q8'],
        'Toyota': ['Aygo', 'Aygo X', 'Yaris', 'Yaris Cross', 'GR Yaris', 'Corolla', 'Corolla Touring Sports', 'Auris', 'Avensis', 'Camry', 'C-HR', 'RAV4', 'Highlander', 'Land Cruiser', 'Land Cruiser 150', 'Hilux', 'Prius', 'Proace', 'Proace City', 'Proace Verso', 'Supra', 'GR86', 'bZ4X', 'Verso', 'Urban Cruiser'],
        'Ford': ['Ka/Ka+', 'Fiesta', 'Focus', 'Focus Combi', 'Mondeo', 'Mondeo Combi', 'Fusion', 'B-MAX', 'C-MAX', 'S-MAX', 'Galaxy', 'EcoSport', 'Puma', 'Kuga', 'Edge', 'Explorer', 'Mustang', 'Mustang Mach-E', 'Ranger', 'Transit', 'Transit Connect', 'Transit Custom', 'Transit/Tourneo Courier', 'Tourneo Connect', 'Tourneo Custom'],
        'Hyundai': ['i10', 'i20', 'i30', 'i30 Kombi', 'i30 N', 'i40', 'i40 Kombi', 'ix20', 'ix35', 'ix55', 'Accent', 'Elantra', 'Sonata', 'Kona', 'Kona Electric', 'Bayon', 'Tucson', 'Santa Fe', 'Ioniq', 'Ioniq 5', 'Ioniq 6', 'Nexo', 'Staria', 'Getz', 'Matrix'],
        'Kia': ['Picanto', 'Rio', 'Ceed', 'Ceed SW', 'ProCeed', 'XCeed', 'Cerato', 'Optima', 'Stinger', 'Soul', 'Venga', 'Niro', 'e-Niro', 'Niro EV', 'Stonic', 'Sportage', 'Sorento', 'Carnival', 'EV6', 'EV9'],
        'Peugeot': ['107', '108', '206', '206+', '207', '208', 'e-208', '301', '307', '308', '308 SW', '408', '407', '508', '508 SW', '2008', 'e-2008', '3008', '4007', '4008', '5008', 'Partner', 'Rifter', 'Expert', 'Traveller', 'Bipper', 'RCZ', '1007'],
        'Renault': ['Twingo', 'Clio', 'Clio Grandtour', 'Symbol/Thalia', 'Megane', 'Megane Grandtour', 'Mégane E-Tech', 'Fluence', 'Laguna', 'Latitude', 'Talisman', 'Talisman Grandtour', 'Scenic', 'Grand Scenic', 'Espace', 'Modus', 'Captur', 'Kadjar', 'Austral', 'Koleos', 'Arkana', 'Kangoo', 'Trafic', 'Master', 'Zoe', 'Wind'],
        'Opel': ['Adam', 'Karl/Rocks', 'Corsa', 'Corsa-e', 'Astra', 'Astra Sports Tourer', 'Insignia', 'Insignia Sports Tourer', 'Meriva', 'Zafira', 'Zafira Life', 'Combo', 'Combo Life', 'Crossland', 'Crossland X', 'Grandland', 'Grandland X', 'Mokka', 'Mokka-e', 'Antara', 'Vivaro', 'Movano', 'Cascada', 'Ampera/Ampera-e', 'Signum', 'Vectra'],
        'Seat': ['Mii', 'Ibiza', 'Ibiza ST', 'Leon', 'Leon ST', 'Leon Sportstourer', 'Toledo', 'Altea', 'Altea XL', 'Alhambra', 'Arona', 'Ateca', 'Tarraco'],
        'Volvo': ['S40', 'S60', 'S90', 'V40', 'V40 Cross Country', 'V50', 'V60', 'V60 Cross Country', 'V70', 'V90', 'V90 Cross Country', 'C30', 'C40 Recharge', 'XC40', 'XC40 Recharge', 'XC60', 'XC70', 'XC90', 'EX30', 'EX90'],
        'Honda': ['Jazz', 'Civic', 'Civic Tourer', 'Accord', 'Insight', 'CR-V', 'HR-V', 'ZR-V', 'e:Ny1', 'Honda e', 'CR-Z', 'FR-V', 'Legend'],
        'Mazda': ['2', '3', '5', '6', '6 Wagon', 'CX-3', 'CX-30', 'CX-5', 'CX-60', 'CX-7', 'CX-9', 'MX-5', 'MX-30', 'RX-8'],
        'Nissan': ['Micra', 'Note', 'Almera', 'Pulsar', 'Leaf', 'Juke', 'Qashqai', 'X-Trail', 'Ariya', 'Navara', 'Pathfinder', 'Murano', '370Z', 'GT-R', 'NV200', 'NV300', 'Townstar', 'Primera', 'Tiida'],
        'Citroën': ['C1', 'C2', 'C3', 'C3 Picasso', 'C3 Aircross', 'C4', 'C4 Cactus', 'C4 Picasso', 'C4 SpaceTourer', 'C4 X', 'ë-C4', 'C5', 'C5 Aircross', 'C5 X', 'C6', 'C8', 'C-Elysée', 'DS3', 'DS4', 'DS5', 'Nemo', 'Berlingo', 'SpaceTourer', 'Jumpy', 'Jumper', 'Xsara Picasso'],
        'Fiat': ['500', '500e', '500X', '500L', '500L Living', 'Panda', 'Punto', 'Grande Punto', 'Punto Evo', 'Tipo', 'Tipo SW', 'Bravo', 'Linea', 'Croma', 'Sedici', 'Freemont', 'Qubo', 'Doblo', 'Fiorino', 'Talento', 'Ducato', 'Strada', '124 Spider', '600e'],
        'Porsche': ['911', '918 Spyder', 'Boxster/718 Boxster', 'Cayman/718 Cayman', 'Cayenne', 'Cayenne Coupé', 'Macan', 'Macan Electric', 'Panamera', 'Panamera Sport Turismo', 'Taycan', 'Taycan Cross Turismo'],
        'Land Rover': ['Defender', 'Discovery', 'Discovery Sport', 'Freelander 2', 'Range Rover', 'Range Rover Sport', 'Range Rover Velar', 'Range Rover Evoque'],
        'Subaru': ['Impreza', 'WRX', 'WRX STI', 'Legacy', 'Levorg', 'Outback', 'Forester', 'XV/Crosstrek', 'BRZ', 'Solterra', 'Justy', 'Trezia'],
    };

    // ---------- Brand → Model filtering ----------
    brandSelect.addEventListener('change', function () {
        const brand = this.value;
        modelSelect.innerHTML = '';

        if (!brand) {
            modelSelect.innerHTML = '<option value="">-- Nejprve vyberte značku --</option>';
            return;
        }

        const models = MODEL_DB[brand];
        if (!models) {
            // brand "Jiná" or unknown
            modelSelect.innerHTML = '<option value="">-- Zadejte model ručně --</option>';
            modelSelect.insertAdjacentHTML('beforeend', '<option value="__custom__">✏️ Zadat vlastní model…</option>');
            return;
        }

        modelSelect.innerHTML = '<option value="">-- Vyberte model --</option>';
        models.forEach(function (m) {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            modelSelect.appendChild(opt);
        });
        // Always add custom option at the end
        const customOpt = document.createElement('option');
        customOpt.value = '__custom__';
        customOpt.textContent = '✏️ Jiný model…';
        modelSelect.appendChild(customOpt);
    });

    // Handle custom model entry
    modelSelect.addEventListener('change', function () {
        if (this.value === '__custom__') {
            const custom = prompt('Zadejte název modelu:');
            if (custom && custom.trim()) {
                const opt = document.createElement('option');
                opt.value = custom.trim();
                opt.textContent = custom.trim();
                this.insertBefore(opt, this.querySelector('[value="__custom__"]'));
                this.value = custom.trim();
            } else {
                this.value = '';
            }
        }
    });

    // ---------- Init: populate year dropdown ----------
    (function populateYears() {
        const currentYear = new Date().getFullYear();
        for (let y = currentYear; y >= 1990; y--) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            yearSelect.appendChild(opt);
        }
    })();

    function normalizeVin(value) {
        return String(value || '')
            .toUpperCase()
            .replace(/[^A-HJ-NPR-Z0-9]/g, '')
            .slice(0, 17);
    }

    if (vinInput) {
        vinInput.addEventListener('input', function () {
            this.value = normalizeVin(this.value);
        });
    }

    // ---------- kW → hp live conversion ----------
    powerKwInput.addEventListener('input', function () {
        const kw = parseFloat(this.value) || 0;
        hpDisplay.textContent = '= ' + Math.round(kw * 1.35962) + ' hp';
    });

    // ---------- Shared data: field IDs to sync ----------
    const SHARED_FIELDS = [
        'brand', 'model', 'year', 'trim', 'vin', 'fuelType', 'engineCapacity', 'powerKw',
        'transmission', 'drivetrain', 'mileage', 'bodyType', 'color', 'techCondition',
        'consumption', 'serviceHistory', 'owners', 'doors', 'paintCondition',
        'accidents', 'originCountry', 'tires', 'stkValidity', 'importDetail',
        'market', 'saleType', 'currency', 'notes'
    ];

    // ---------- Load shared data from description page ----------
    (function loadSharedData() {
        if (typeof AutoCenyShared === 'undefined') return;
        // Deep-link z garáže: #garage=carId
        var hash = window.location.hash;
        if (hash.indexOf('#garage=') === 0 && typeof CarGarage !== 'undefined') {
            var carId = hash.replace('#garage=', '');
            var car = CarGarage.get(carId);
            if (car) {
                currentGarageCarId = carId;
                CarGarage.fillFormFromCar(car, SHARED_FIELDS, 'equipment', brandSelect);
                window.location.hash = '';
                return;
            }
        }
        const data = AutoCenyShared.load();
        if (data) {
            if (data.brand) {
                brandSelect.value = data.brand;
                brandSelect.dispatchEvent(new Event('change'));
            }
            setTimeout(function () {
                AutoCenyShared.fillForm(data, SHARED_FIELDS, 'equipment');
            }, 50);
        }
    })();

    // ---------- Save shared data on form change ----------
    form.addEventListener('change', function () {
        if (typeof AutoCenyShared === 'undefined') return;
        const data = AutoCenyShared.gatherFromForm(SHARED_FIELDS, 'equipment');
        AutoCenyShared.save(data);
    });

    // ---------- Form validation ----------
    function validateForm() {
        let valid = true;
        const requiredFields = [
            { el: document.getElementById('brand'), name: 'Značka' },
            { el: document.getElementById('model'), name: 'Model' },
            { el: document.getElementById('year'), name: 'Rok výroby' },
        ];

        requiredFields.forEach(({ el }) => el.classList.remove('invalid'));
        if (vinInput) {
            vinInput.classList.remove('invalid');
        }

        for (const { el, name } of requiredFields) {
            if (!el.value.trim()) {
                el.classList.add('invalid');
                valid = false;
            }
        }

        if (vinInput) {
            const vinValue = normalizeVin(vinInput.value);
            vinInput.value = vinValue;
            if (vinValue && vinValue.length !== 17) {
                vinInput.classList.add('invalid');
                valid = false;
            }
        }

        if (!valid) {
            const first = requiredFields.find(f => f.el.classList.contains('invalid'));
            if (first) {
                first.el.focus();
            } else if (vinInput && vinInput.classList.contains('invalid')) {
                vinInput.focus();
            }
        }

        return valid;
    }



    // ---------- Token costs ----------
    // Defaults mirror src/lib/tokens.ts TOKEN_COSTS; the live price list
    // (admin-editable in /admin → Ceník služeb) is fetched from the API below.
    var TIER_TOKEN_COSTS = { quick: 2, standard: 6, detailed: 10, expert: 14 };

    function applyTierPricing(features) {
        for (var i = 0; i < features.length; i++) {
            var f = features[i];
            var match = /^estimator:(quick|standard|detailed|expert)$/.exec(f.feature || '');
            if (!match) continue;
            var tier = match[1];
            TIER_TOKEN_COSTS[tier] = f.cost;
            // Show the price on the tier card (appended to the meta line).
            var input = document.getElementById('tier-' + tier);
            var meta = input && input.parentElement
                ? input.parentElement.querySelector('.tier-meta')
                : null;
            if (meta) {
                var priceEl = meta.parentElement.querySelector('.tier-cost');
                if (!priceEl) {
                    priceEl = document.createElement('span');
                    priceEl.className = 'tier-meta tier-cost';
                    meta.parentElement.appendChild(priceEl);
                }
                priceEl.textContent = f.cost === 0
                    ? 'Zdarma'
                    : f.cost + ' token' + (f.cost === 1 ? '' : (f.cost >= 2 && f.cost <= 4 ? 'y' : 'ů'));
            }
        }
    }

    fetch('/api/tokens/pricing')
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (json) {
            if (json && json.features) applyTierPricing(json.features);
        })
        .catch(function () { /* offline → keep defaults */ });

    function deductLocalTokens(cost) {
        try {
            var raw = localStorage.getItem('autoai_credits_v1');
            var wallet = raw ? JSON.parse(raw) : { balance: 100 };
            wallet.balance = Math.max(0, (wallet.balance || 0) - cost);
            localStorage.setItem('autoai_credits_v1', JSON.stringify(wallet));
            // Notify the Navbar badge in the parent frame (same origin)
            try { window.parent.dispatchEvent(new CustomEvent('autoai:credits-changed')); } catch (e) {}
        } catch (e) { /* ignore storage errors */ }
    }

    // ---------- Scope toggle hint update ----------
    document.querySelectorAll('input[name="searchScope"]').forEach(function (radio) {
        radio.addEventListener('change', function () {
            var hint = document.getElementById('scopePortalsHint');
            if (!hint) return;
            if (this.value === 'international') {
                hint.textContent = 'Přední české i zahraniční inzertní portály';
            } else {
                hint.textContent = 'Přední české inzertní portály';
            }
        });
    });

    // ---------- Call Price Estimator API (server-side, with DB cache) ----------
    // Helper: read a value if the element exists and has a non-empty trimmed value.
    function readField(id) {
        var el = document.getElementById(id);
        if (!el) return '';
        var v = (el.value || '').trim();
        return v;
    }
    function readNumberField(id) {
        var raw = readField(id);
        if (!raw) return null;
        var n = parseFloat(raw.replace(',', '.'));
        return Number.isFinite(n) ? n : null;
    }
    function readEquipmentCheckboxes() {
        var checked = document.querySelectorAll('input[name="equipment"]:checked');
        var values = [];
        checked.forEach(function (el) { if (el.value) values.push(el.value); });
        return values;
    }

    async function callPriceEstimatorAPI() {
        var tier = document.querySelector('input[name="analysisTier"]:checked').value;
        var scopeEl = document.querySelector('input[name="searchScope"]:checked');
        var scope = scopeEl ? scopeEl.value : 'czech';

        // Base car data sent for ALL tiers.
        var car = {
            brand:        readField('brand'),
            model:        readField('model'),
            year:         parseInt(readField('year'), 10),
            mileage:      parseInt(readField('mileage') || '0', 10) || 0,
            transmission: readField('transmission'),
            fuel:         readField('fuelType')
        };

        // For DETAILED and EXPERT tiers, enrich payload with every form field
        // the user filled. These extras feed deeper prompts on the server side
        // (see src/lib/run-scan.ts buildCarBlock) and significantly improve
        // valuation accuracy. Quick/standard intentionally stay lean.
        var enrichTiers = ['detailed', 'expert'];
        if (enrichTiers.indexOf(tier) !== -1) {
            var trim          = readField('trim');
            var vin           = readField('vin');
            var engineCapacity= readNumberField('engineCapacity');
            var powerKw       = readNumberField('powerKw');
            var drivetrain    = readField('drivetrain');
            var bodyType      = readField('bodyType');
            var color         = readField('color');
            var techCondition = readField('techCondition');
            var paintCondition= readField('paintCondition');
            var accidents     = readField('accidents');
            var serviceHistory= readField('serviceHistory');
            var owners        = readField('owners');
            var consumption   = readField('consumption');
            var originCountry = readField('originCountry');
            var tires         = readField('tires');
            var stkValidity   = readField('stkValidity');
            var importDetail  = readField('importDetail');
            var notes         = readField('notes');
            var equipment     = readEquipmentCheckboxes();

            if (trim)           car.trim = trim;
            if (vin)            car.vin = vin;
            if (engineCapacity !== null) car.engineCapacity = engineCapacity;
            if (powerKw !== null)        car.powerKw = powerKw;
            if (drivetrain)     car.drivetrain = drivetrain;
            if (bodyType)       car.bodyType = bodyType;
            if (color)          car.color = color;
            if (techCondition)  car.techCondition = techCondition;
            if (paintCondition) car.paintCondition = paintCondition;
            if (accidents)      car.accidents = accidents;
            if (serviceHistory) car.serviceHistory = serviceHistory;
            if (owners)         car.owners = owners;
            if (consumption)    car.consumption = consumption;
            if (originCountry)  car.originCountry = originCountry;
            if (tires)          car.tires = tires;
            if (stkValidity)    car.stkValidity = stkValidity;
            if (importDetail)   car.importDetail = importDetail;
            if (notes)          car.notes = notes;
            if (equipment.length > 0) car.equipment = equipment;
        }

        var response = await fetch('/api/price-estimator', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ car: car, tier: tier, scope: scope })
        });

        if (!response.ok) {
            var errBody = {};
            try { errBody = await response.json(); } catch (e) { /* ignore */ }
            var errMsg = errBody.error || response.statusText;
            if (response.status === 401) {
                var authErr = new Error(errMsg);
                authErr.isAuth = true;
                throw authErr;
            }
            throw new Error('API chyba ' + response.status + ': ' + errMsg);
        }

        return response.json();
    }


    // ---------- Simple Markdown → HTML renderer ----------
    function renderMarkdown(md) {
        let html = md;

        // Escape HTML entities (prevent XSS)
        html = html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Headings
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

        // Bold
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Italic
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Tables
        html = html.replace(/^(\|.+\|)\n\|[-| :]+\|\n((\|.+\|\n?)+)/gm, function (match, headerRow, bodyRows) {
            const headers = headerRow.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
            const rows = bodyRows.trim().split('\n').map(row => {
                const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
                return `<tr>${cells}</tr>`;
            }).join('');
            return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
        });

        // Markdown links [text](url) → clickable anchors (e.g. "Link" column
        // in detailed/expert tables). rel guards against opener abuse and
        // tells crawlers we don't endorse/transfer ranking to listed ads.
        html = html.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
            '<a href="$2" target="_blank" rel="nofollow noopener noreferrer">$1</a>');

        // Unordered lists
        html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

        // Paragraphs (lines that aren't already wrapped in tags)
        html = html.replace(/^(?!<[hultro])((?!<).+)$/gm, '<p>$1</p>');

        // Clean up extra blank lines
        html = html.replace(/\n{2,}/g, '\n');

        // Detect and highlight the main price line
        html = html.replace(
            /<li><strong>Doporučená prodejní cena:<\/strong>\s*(.+?)<\/li>/i,
            function (match, price) {
                return `<li><strong>Doporučená prodejní cena:</strong> ${price}</li></ul><div class="price-highlight">Doporučená prodejní cena: ${price}</div><ul>`;
            }
        );
        // Clean up potentially empty <ul></ul> pairs
        html = html.replace(/<ul>\s*<\/ul>/g, '');

        return html;
    }

    // ---------- Set loading state ----------
    function setLoading(loading) {
        submitBtn.disabled = loading;
        btnText.style.display = loading ? 'none' : 'inline';
        btnSpinner.style.display = loading ? 'inline-flex' : 'none';
    }

    // ---------- Live progress panel (long-running detailed/expert scans) ----------
    // Samotný spinner působí jako zamrznutí — proto během čekání zobrazíme odpočet
    // + fáze analýzy. Odhady (s) jsou hrubé; expert/detailed teď s web_fetch
    // a hlubokým uvažováním běží i několik minut (server limit je 800 s).
    var TIER_PROGRESS = {
        quick:    { est: 22,  label: 'Rychlý odhad' },
        standard: { est: 40,  label: 'Standardní analýza' },
        detailed: { est: 90,  label: 'Detailní posudek' },
        expert:   { est: 130, label: 'Expertní posudek' }
    };

    function startProgress(tier, scope) {
        var cfg = TIER_PROGRESS[tier] || TIER_PROGRESS.standard;
        var portals = scope === 'international'
            ? 'přední české i zahraniční inzertní portály'
            : 'přední české inzertní portály';

        // Fáze se odvíjejí od podílu uplynulého času vůči odhadu (0–1).
        var stages = [
            { at: 0.00, text: 'Odesílám zadání a sestavuji dotaz…' },
            { at: 0.10, text: 'Prohledávám aktuální inzeráty (' + portals + ')…' },
            { at: 0.40, text: 'Porovnávám nalezené ceny a čistím odlehlé hodnoty…' },
            { at: 0.65, text: 'Vyhodnocuji výbavu, stav a nájezd vozu…' },
            { at: 0.85, text: 'Sestavuji finální posudek a doporučení…' }
        ];

        var slow = (tier === 'detailed' || tier === 'expert');
        var hint = slow
            ? 'Hloubková analýza obvykle trvá do ~2 minut (model prohledává a porovnává inzeráty). Nechte prosím okno otevřené.'
            : 'Obvykle do ' + cfg.est + ' s.';

        resultContent.innerHTML =
            '<div class="scan-progress">' +
              '<div class="scan-progress-head">' +
                '<span class="spinner"></span>' +
                '<span class="scan-progress-title">' + cfg.label + ' probíhá…</span>' +
                '<span class="scan-progress-time" id="scanElapsed">0&nbsp;s</span>' +
              '</div>' +
              '<div class="scan-progress-bar"><div class="scan-progress-fill" id="scanFill"></div></div>' +
              '<div class="scan-progress-stage" id="scanStage">' + stages[0].text + '</div>' +
              '<div class="scan-progress-hint">' + hint + '</div>' +
            '</div>';
        resultSection.style.display = 'block';
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        var startedAt = Date.now();
        var fillEl = document.getElementById('scanFill');
        var stageEl = document.getElementById('scanStage');
        var elapsedEl = document.getElementById('scanElapsed');

        var timer = setInterval(function () {
            var elapsed = (Date.now() - startedAt) / 1000;
            var ratio = Math.min(elapsed / cfg.est, 1);
            // Bar plyne k 95 %, posledních 5 % se dorovná až po dokončení.
            if (fillEl) fillEl.style.width = Math.min(95, ratio * 95).toFixed(1) + '%';
            if (elapsedEl) elapsedEl.innerHTML = Math.round(elapsed) + '&nbsp;s';
            if (stageEl) {
                var current = stages[0].text;
                for (var i = 0; i < stages.length; i++) {
                    if (ratio >= stages[i].at) current = stages[i].text;
                }
                if (stageEl.textContent !== current) stageEl.textContent = current;
            }
        }, 250);

        return function stop() {
            clearInterval(timer);
            if (fillEl) fillEl.style.width = '100%';
        };
    }

    // ---------- Form submit handler ----------
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!validateForm()) return;

        var tierEl = document.querySelector('input[name="analysisTier"]:checked');
        var scopeEl = document.querySelector('input[name="searchScope"]:checked');
        var activeTier = tierEl ? tierEl.value : 'standard';
        var activeScope = scopeEl ? scopeEl.value : 'czech';

        setLoading(true);
        var stopProgress = startProgress(activeTier, activeScope);

        try {
            var result = await callPriceEstimatorAPI();

            // Deduct from localStorage when server couldn't (no Supabase session)
            if (!result.tokensDeducted) {
                var usedTier = document.querySelector('input[name="analysisTier"]:checked').value;
                deductLocalTokens(TIER_TOKEN_COSTS[usedTier] || 6);
            }

            var text = result.markdownText || 'Žádná analýza nebyla vrácena.';
            var html = renderMarkdown(text);

            // Cache indicator badge
            var cacheHtml = '';
            var count = result.listingCount || 0;
            if (result.cached === true && result.ageHours != null) {
                var daysAgo = (result.ageHours / 24).toFixed(1);
                cacheHtml = '<div class="cache-notice">📋 Odhad na základě ' + count + ' inzerátů z minulého skenu (před ' + daysAgo + ' dny)</div>';
            } else if (result.cached === false) {
                cacheHtml = '<div class="cache-notice cache-notice-fresh">✨ Odhad na základě ' + count + ' aktuálních inzerátů (čerstvý scan)</div>';
            }

            // Zdroje — odkazy na původní inzeráty (transparentnost + atribuce
            // portálům; odkazování je legální, viz /zdroje-dat).
            var sourcesHtml = '';
            if (Array.isArray(result.sources) && result.sources.length > 0) {
                var items = result.sources.map(function (src) {
                    if (!src || !src.url) return '';
                    var label = escapeHtml(src.portal || 'Inzerát');
                    var title = src.title ? ' — ' + escapeHtml(src.title) : '';
                    var price = src.price ? ' — ' + Number(src.price).toLocaleString('cs-CZ') + ' Kč' : '';
                    return '<li><a href="' + escapeHtml(src.url) + '" target="_blank" rel="nofollow noopener noreferrer">'
                        + label + title + '</a>' + price + '</li>';
                }).join('');
                if (items) {
                    sourcesHtml =
                        '<h2>🔗 Zdroje — původní inzeráty</h2>' +
                        '<ul>' + items + '</ul>' +
                        '<p style="font-size:13px;opacity:0.75;">Odkazy vedou na původní inzeráty na uvedených portálech. '
                        + 'Více o tom, jak s daty pracujeme: <a href="/zdroje-dat" target="_top">Zdroje dat</a>.</p>';
                }
            }

            resultContent.innerHTML = cacheHtml + html + sourcesHtml;
            resultSection.style.display = 'block';
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (err) {
            if (err.isAuth) {
                resultContent.innerHTML =
                    '<div style="color:var(--danger);font-weight:600;">❌ ' + escapeHtml(err.message) + '</div>' +
                    '<div style="margin-top:12px;">' +
                    '<a href="/prihlaseni" target="_top" style="color:var(--accent);font-weight:500;">Přihlásit se</a>' +
                    ' &nbsp;·&nbsp; ' +
                    '<a href="/cenik" target="_top" style="color:var(--accent);font-weight:500;">Koupit tokeny</a>' +
                    '</div>';
            } else {
                resultContent.innerHTML = '<div style="color:var(--danger);font-weight:600;">❌ Chyba: ' + escapeHtml(err.message) + '</div>';
            }
            resultSection.style.display = 'block';
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } finally {
            stopProgress();
            setLoading(false);
        }
    });

    // ---------- Copy result ----------
    copyBtn.addEventListener('click', function () {
        const text = resultContent.innerText;
        navigator.clipboard.writeText(text).then(() => {
            copyBtn.textContent = '✅ Zkopírováno!';
            copyBtn.classList.add('copied');
            setTimeout(() => {
                copyBtn.textContent = '📋 Kopírovat';
                copyBtn.classList.remove('copied');
            }, 2000);
        });
    });

    // ---------- Utility: escape HTML ----------
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ---------- Přidat do monitoringu ----------
    const addToMonitorBtn = document.getElementById('addToMonitorBtn');
    if (addToMonitorBtn) {
        addToMonitorBtn.addEventListener('click', function () {
            const brand = document.getElementById('brand').value;
            const model = document.getElementById('model').value;
            const year = document.getElementById('year').value;
            const mileage = document.getElementById('mileage').value;
            const transmission = document.getElementById('transmission').value;
            const fuel = document.getElementById('fuelType').value;

            if (!brand || !model || !year) {
                alert('Vyplňte alespoň značku, model a rok výroby.');
                return;
            }

            const car = {
                id: 'car_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                brand: brand,
                model: model,
                year: parseInt(year, 10),
                mileage: mileage ? parseInt(mileage, 10) : 0,
                transmission: transmission || '',
                fuel: fuel || '',
                scans: []
            };

            const MONITOR_KEY = 'autoceny_monitor_cars';
            let cars = [];
            try { cars = JSON.parse(localStorage.getItem(MONITOR_KEY)) || []; } catch (e) {}

            // Kontrola duplicit
            const exists = cars.some(c =>
                c.brand === car.brand && c.model === car.model &&
                c.year === car.year && c.mileage === car.mileage
            );

            if (exists) {
                alert('Toto auto již je v monitoringu.');
                return;
            }

            cars.push(car);
            localStorage.setItem(MONITOR_KEY, JSON.stringify(cars));

            if (confirm('Auto bylo přidáno do monitoringu.\nChcete přejít na stránku monitoringu?')) {
                window.location.href = '/monitoring';
            }
        });
    }

    // ---------- Garáž: auto-save & picker ----------
    var GARAGE_FIELDS = [
        'brand', 'model', 'year', 'trim', 'vin', 'fuelType', 'engineCapacity', 'powerKw',
        'transmission', 'drivetrain', 'mileage', 'bodyType', 'color', 'techCondition',
        'consumption', 'serviceHistory', 'owners', 'doors', 'paintCondition',
        'accidents', 'originCountry', 'tires', 'stkValidity', 'importDetail', 'notes'
    ];

    var currentGarageCarId = null;

    function initGaragePicker() {
        if (typeof CarGarage === 'undefined') return;
        var section = document.getElementById('garagePickerSection');
        var picker = document.getElementById('garagePicker');
        var loadBtn = document.getElementById('garageLoadBtn');
        var deleteBtn = document.getElementById('garageDeleteBtn');
        var hint = document.getElementById('garageHint');
        var editLabel = document.getElementById('garageEditLabel');
        if (!section || !picker) return;

        function refreshPicker() {
            var cars = CarGarage.getAll();
            picker.innerHTML = '<option value="">-- Nové auto --</option>';
            cars.forEach(function (car) {
                var opt = document.createElement('option');
                opt.value = car.id;
                opt.textContent = CarGarage.getLabel(car) + (CarGarage.getDetail(car) ? ' · ' + CarGarage.getDetail(car) : '');
                picker.appendChild(opt);
            });
            section.style.display = cars.length > 0 ? '' : 'none';
            if (currentGarageCarId) {
                picker.value = currentGarageCarId;
            }
        }

        loadBtn.addEventListener('click', function () {
            var id = picker.value;
            if (!id) {
                currentGarageCarId = null;
                hint.style.display = 'none';
                form.reset();
                yearSelect.innerHTML = '<option value="">-- Vyberte --</option>';
                var cy = new Date().getFullYear();
                for (var y = cy; y >= 1990; y--) {
                    var opt = document.createElement('option');
                    opt.value = y; opt.textContent = y; yearSelect.appendChild(opt);
                }
                modelSelect.innerHTML = '<option value="">-- Nejprve vyberte značku --</option>';
                return;
            }
            var car = CarGarage.get(id);
            if (!car) return;
            currentGarageCarId = car.id;
            CarGarage.fillFormFromCar(car, GARAGE_FIELDS, 'equipment', brandSelect);
            hint.style.display = '';
            editLabel.textContent = CarGarage.getLabel(car);
        });

        deleteBtn.addEventListener('click', function () {
            var id = picker.value;
            if (!id) return;
            var car = CarGarage.get(id);
            if (!car) return;
            if (!confirm('Opravdu smazat "' + CarGarage.getLabel(car) + '" z garáže?')) return;
            CarGarage.remove(id);
            currentGarageCarId = null;
            hint.style.display = 'none';
            refreshPicker();
        });

        window.addEventListener('garage-changed', refreshPicker);
        refreshPicker();
    }

    // Auto-save do garáže při odeslání formuláře
    form.addEventListener('submit', function () {
        if (typeof CarGarage === 'undefined') return;
        var brand = brandSelect.value;
        var model = modelSelect.value;
        var year = yearSelect.value;
        var vin = vinInput ? normalizeVin(vinInput.value) : '';
        if (!brand || !model || !year) return;

        var carData = CarGarage.gatherCar(GARAGE_FIELDS, 'equipment');

        if (currentGarageCarId) {
            carData.id = currentGarageCarId;
            var existing = CarGarage.get(currentGarageCarId);
            if (existing) carData.createdAt = existing.createdAt;
        } else {
            var match = CarGarage.findMatch(brand, model, year, vin);
            if (match) {
                carData.id = match.id;
                carData.createdAt = match.createdAt;
                currentGarageCarId = match.id;
            }
        }

        CarGarage.save(carData);
    });

    initGaragePicker();

})();
