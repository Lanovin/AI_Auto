/* ===== AutoCeny – popisky.js ===== */
(function () {
    'use strict';

    // ---------- DOM references ----------
    const form = document.getElementById('descForm');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');
    const resultSection = document.getElementById('resultSection');
    const resultContent = document.getElementById('resultContent');
    const tokenInfo = document.getElementById('tokenInfo');
    const copyBtn = document.getElementById('copyBtn');
    const powerKwInput = document.getElementById('powerKw');
    const hpDisplay = document.getElementById('hpDisplay');
    const yearSelect = document.getElementById('year');
    const brandSelect = document.getElementById('brand');
    const modelSelect = document.getElementById('model');
    const vinInput = document.getElementById('vin');

    // ---------- Model database (same as app.js) ----------
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

    // ---------- Shared form field IDs ----------
    const SHARED_FIELDS = [
        'brand', 'model', 'year', 'trim', 'vin', 'fuelType', 'engineCapacity', 'powerKw',
        'transmission', 'drivetrain', 'mileage', 'bodyType', 'color', 'techCondition',
        'consumption', 'serviceHistory', 'owners'
    ];

    function normalizeVin(value) {
        return String(value || '')
            .toUpperCase()
            .replace(/[^A-HJ-NPR-Z0-9]/g, '')
            .slice(0, 17);
    }

    // ---------- Brand → Model filtering ----------
    brandSelect.addEventListener('change', function () {
        var brand = this.value;
        modelSelect.innerHTML = '';

        if (!brand) {
            modelSelect.innerHTML = '<option value="">-- Nejprve vyberte značku --</option>';
            return;
        }

        var models = MODEL_DB[brand];
        if (!models) {
            modelSelect.innerHTML = '<option value="">-- Zadejte model ručně --</option>';
            modelSelect.insertAdjacentHTML('beforeend', '<option value="__custom__">✏️ Zadat vlastní model…</option>');
            return;
        }

        modelSelect.innerHTML = '<option value="">-- Vyberte model --</option>';
        models.forEach(function (m) {
            var opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            modelSelect.appendChild(opt);
        });
        var customOpt = document.createElement('option');
        customOpt.value = '__custom__';
        customOpt.textContent = '✏️ Jiný model…';
        modelSelect.appendChild(customOpt);
    });

    modelSelect.addEventListener('change', function () {
        if (this.value === '__custom__') {
            var custom = prompt('Zadejte název modelu:');
            if (custom && custom.trim()) {
                var opt = document.createElement('option');
                opt.value = custom.trim();
                opt.textContent = custom.trim();
                this.insertBefore(opt, this.querySelector('[value="__custom__"]'));
                this.value = custom.trim();
            } else {
                this.value = '';
            }
        }
    });

    // ---------- Init: populate years ----------
    (function populateYears() {
        var currentYear = new Date().getFullYear();
        for (var y = currentYear; y >= 1990; y--) {
            var opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            yearSelect.appendChild(opt);
        }
    })();

    // ---------- kW → hp ----------
    powerKwInput.addEventListener('input', function () {
        var kw = parseFloat(this.value) || 0;
        hpDisplay.textContent = '= ' + Math.round(kw * 1.35962) + ' hp';
    });

    if (vinInput) {
        vinInput.addEventListener('input', function () {
            this.value = normalizeVin(this.value);
        });
    }

    // ---------- Load shared data from pricing page ----------
    (function loadSharedData() {
        // Deep-link z garáže: #garage=carId
        var hash = window.location.hash;
        if (hash.indexOf('#garage=') === 0 && typeof CarGarage !== 'undefined') {
            var carId = hash.replace('#garage=', '');
            var car = CarGarage.get(carId);
            if (car) {
                CarGarage.fillFormFromCar(car, SHARED_FIELDS, 'equipment', brandSelect);
                window.location.hash = '';
                return;
            }
        }
        var data = AutoCenyShared.load();
        if (data) {
            if (data.brand) {
                brandSelect.value = data.brand;
                brandSelect.dispatchEvent(new Event('change'));
            }
            setTimeout(function () {
                AutoCenyShared.fillForm(data, SHARED_FIELDS, 'equipment');
                document.getElementById('sharedDataNotice').style.display = 'block';
            }, 50);
        }
    })();

    // ---------- Save data on change (so pricing page can pick it up) ----------
    form.addEventListener('change', function () {
        var data = AutoCenyShared.gatherFromForm(SHARED_FIELDS, 'equipment');
        AutoCenyShared.save(data);
    });

    // ---------- Description tier configs ----------
    var LENGTH_CONFIG = {
        short:  { max_tokens: 500,  model: 'claude-opus-4-6' },
        medium: { max_tokens: 1500, model: 'claude-opus-4-6' },
        long:   { max_tokens: 3000, model: 'claude-opus-4-6' },
        extra:  { max_tokens: 5000, model: 'claude-opus-4-6' }
    };

    var STYLE_PROMPTS = {
        sales: 'Piš PRODEJNÍ popisek – přesvědčivý, zdůrazňující výhody vozu, vzbuzující zájem kupujícího. Používej aktivní jazyk a pozitivní formulace. Zaměř se na benefity pro kupujícího.',
        informational: 'Piš INFORMAČNÍ popisek – věcný, přehledný, zaměřený na fakta a technické parametry. Strukturuj text do logických sekcí.',
        premium: 'Piš PREMIUM popisek – elegantní, luxusní prezentace vozu. Používej sofistikovaný jazyk, zdůrazni exkluzivitu, kvalitu zpracování a prestižní charakter vozu.',
        casual: 'Piš NEFORMÁLNÍ popisek – přátelský, přirozený tón jako při osobním rozhovoru. Vhodný pro soukromý prodej na Bazos. Buď upřímný a lidský.',
        technical: 'Piš TECHNICKÝ popisek – zaměřený na detailní technické parametry, specifikace motoru, podvozku a výbavy. Pro znalce a automobilové nadšence.',
        minimal: 'Piš MINIMÁLNÍ strukturovaný popisek – stručné odrážky s klíčovými parametry a informacemi. Žádný plynulý text, jen body.'
    };

    // ---------- Gather car data text ----------
    function gatherCarDataText() {
        var val = function (id) {
            var el = document.getElementById(id);
            return el ? el.value.trim() : '';
        };

        var checkedEquipment = Array.from(
            document.querySelectorAll('input[name="equipment"]:checked')
        ).map(function (cb) { return cb.value; });

        var parts = [];
        if (val('brand')) parts.push('Značka: ' + val('brand'));
        if (val('model')) parts.push('Model: ' + val('model'));
        if (val('year')) parts.push('Rok výroby: ' + val('year'));
        if (val('trim')) parts.push('Verze: ' + val('trim'));
        if (val('vin')) parts.push('VIN: ' + val('vin'));
        if (val('fuelType')) parts.push('Palivo: ' + val('fuelType'));
        if (val('engineCapacity')) parts.push('Objem motoru: ' + val('engineCapacity') + ' ccm');
        if (val('powerKw')) {
            var kw = parseInt(val('powerKw'), 10);
            parts.push('Výkon: ' + kw + ' kW (' + Math.round(kw * 1.35962) + ' hp)');
        }
        if (val('transmission')) parts.push('Převodovka: ' + val('transmission'));
        if (val('drivetrain')) parts.push('Pohon: ' + val('drivetrain'));
        if (val('mileage')) parts.push('Najeté km: ' + parseInt(val('mileage'), 10).toLocaleString('cs-CZ') + ' km');
        if (val('bodyType')) parts.push('Karoserie: ' + val('bodyType'));
        if (val('color')) parts.push('Barva: ' + val('color'));
        if (val('techCondition')) parts.push('Technický stav: ' + val('techCondition'));
        if (val('consumption')) parts.push('Spotřeba: ' + val('consumption') + ' l/100km');
        if (val('serviceHistory')) parts.push('Servis: ' + val('serviceHistory'));
        if (val('owners')) parts.push('Počet majitelů: ' + val('owners'));
        if (checkedEquipment.length > 0) parts.push('Výbava: ' + checkedEquipment.join(', '));

        return parts.join('\n');
    }

    // ---------- Form validation ----------
    function validateForm() {
        var valid = true;
        var required = [
            { el: document.getElementById('brand'), name: 'Značka' },
            { el: document.getElementById('model'), name: 'Model' },
            { el: document.getElementById('year'), name: 'Rok výroby' },
            { el: document.getElementById('userNotes'), name: 'Poznámky' }
        ];

        required.forEach(function (f) { f.el.classList.remove('invalid'); });
        if (vinInput) {
            vinInput.classList.remove('invalid');
        }

        for (var i = 0; i < required.length; i++) {
            if (!required[i].el.value.trim()) {
                required[i].el.classList.add('invalid');
                valid = false;
            }
        }

        if (vinInput) {
            var vinValue = normalizeVin(vinInput.value);
            vinInput.value = vinValue;
            if (vinValue && vinValue.length !== 17) {
                vinInput.classList.add('invalid');
                valid = false;
            }
        }

        if (!valid) {
            var first = required.find(function (f) { return f.el.classList.contains('invalid'); });
            if (first) {
                first.el.focus();
            } else if (vinInput && vinInput.classList.contains('invalid')) {
                vinInput.focus();
            }
        }
        return valid;
    }

    // ---------- Call API ----------
    async function callAPI(systemPrompt, userMessage, maxTokens, model) {
        var requestBody = {
            model: model,
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }]
        };

        if (!window.AutoAIAnthropic) {
            throw new Error('Centrální Anthropic vrstva není načtená.');
        }

        return window.AutoAIAnthropic.call(requestBody);
    }

    // ---------- Extract text ----------
    function extractText(response) {
        if (!response || !response.content) return 'Žádná odpověď z API.';
        return response.content
            .filter(function (b) { return b.type === 'text'; })
            .map(function (b) { return b.text; })
            .join('\n\n') || 'Odpověď neobsahuje text.';
    }

    // ---------- Set loading state ----------
    function setLoading(loading) {
        submitBtn.disabled = loading;
        btnText.style.display = loading ? 'none' : 'inline';
        btnSpinner.style.display = loading ? 'inline-flex' : 'none';
    }

    // ---------- Escape HTML ----------
    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ---------- Form submit ----------
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (!validateForm()) return;

        var style = document.querySelector('input[name="descStyle"]:checked').value;
        var length = document.querySelector('input[name="descLength"]:checked').value;
        var carData = gatherCarDataText();
        var userNotes = document.getElementById('userNotes').value.trim();
        var extraInstructions = document.getElementById('extraInstructions').value.trim();

        var config = LENGTH_CONFIG[length];
        var stylePrompt = STYLE_PROMPTS[style];

        var systemPrompt = 'Jsi profesionální copywriter specializující se na tvorbu popisků pro prodej automobilů v České republice.\n\n'
            + stylePrompt + '\n\n'
            + 'PRAVIDLA:\n'
            + '- Piš ČESKY.\n'
            + '- Použij data o voze a poznámky prodejce jako základ.\n'
            + '- Nevymýšlej informace, které nemáš – drž se poskytnutých dat.\n'
            + '- Výstup je čistý text popisku, bez komentářů nebo vysvětlení.\n'
            + '- Popisek musí být hotový k použití v inzerátu.';

        var userMessage = '=== DATA O VOZU ===\n' + carData
            + '\n\n=== POZNÁMKY PRODEJCE ===\n' + userNotes;

        if (extraInstructions) {
            userMessage += '\n\n=== SPECIÁLNÍ POŽADAVKY ===\n' + extraInstructions;
        }

        setLoading(true);
        resultSection.style.display = 'none';

        try {
            var response = await callAPI(systemPrompt, userMessage, config.max_tokens, config.model);
            var text = extractText(response);

            resultContent.innerHTML = '<div class="desc-output">' + escapeHtml(text).replace(/\n/g, '<br>') + '</div>';

            // Token info
            var usage = response.usage || {};
            var inTok = usage.input_tokens || 0;
            var outTok = usage.output_tokens || 0;
            tokenInfo.innerHTML = '<small>Použité tokeny: ' + inTok + ' vstup + ' + outTok + ' výstup = ' + (inTok + outTok) + ' celkem</small>';

            resultSection.style.display = 'block';
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (err) {
            resultContent.innerHTML = '<div style="color:var(--danger);font-weight:600;">❌ Chyba: ' + escapeHtml(err.message) + '</div>';
            tokenInfo.innerHTML = '';
            resultSection.style.display = 'block';
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } finally {
            setLoading(false);
        }
    });

    // ---------- Copy result ----------
    copyBtn.addEventListener('click', function () {
        var text = resultContent.innerText;
        navigator.clipboard.writeText(text).then(function () {
            copyBtn.textContent = '✅ Zkopírováno!';
            copyBtn.classList.add('copied');
            setTimeout(function () {
                copyBtn.textContent = '📋 Kopírovat';
                copyBtn.classList.remove('copied');
            }, 2000);
        });
    });

    // ---------- Garáž: car picker ----------
    function initGaragePicker() {
        if (typeof CarGarage === 'undefined') return;
        var section = document.getElementById('garagePickerSection');
        var picker = document.getElementById('garagePicker');
        var loadBtn = document.getElementById('garageLoadBtn');
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
        }

        loadBtn.addEventListener('click', function () {
            var id = picker.value;
            if (!id) {
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
            CarGarage.fillFormFromCar(car, SHARED_FIELDS, 'equipment', brandSelect);
        });

        window.addEventListener('garage-changed', refreshPicker);
        refreshPicker();
    }

    initGaragePicker();

})();
