/* ===== AutoAI – shared.js =====
   Sdílení dat o automobilu mezi stránkami (ceny ↔ popisky)
   + centrální garáž (localStorage)
*/
(function () {
    'use strict';

    var STORAGE_KEY = 'autoceny_car_data';
    var GARAGE_KEY = 'autoai_garage';

    function normalizeVinValue(value) {
        return String(value || '')
            .toUpperCase()
            .replace(/[^A-HJ-NPR-Z0-9]/g, '')
            .slice(0, 17);
    }

    // ===== Garáž (centrální úložiště aut) =====
    var CarGarage = {
        _read: function () {
            try {
                return JSON.parse(localStorage.getItem(GARAGE_KEY)) || [];
            } catch (e) { return []; }
        },

        _write: function (cars) {
            try {
                localStorage.setItem(GARAGE_KEY, JSON.stringify(cars));
            } catch (e) { /* ignore */ }
        },

        /** Vrátí všechna uložená auta */
        getAll: function () {
            return this._read();
        },

        /** Vrátí auto podle ID */
        get: function (id) {
            return this._read().find(function (c) { return c.id === id; }) || null;
        },

        /** Uloží nové auto nebo aktualizuje existující (podle id).
         *  Vrátí uložený objekt s ID. */
        save: function (car) {
            var cars = this._read();
            if (car.id) {
                var idx = -1;
                for (var i = 0; i < cars.length; i++) {
                    if (cars[i].id === car.id) { idx = i; break; }
                }
                if (idx >= 0) {
                    car.updatedAt = new Date().toISOString();
                    cars[idx] = car;
                } else {
                    car.updatedAt = new Date().toISOString();
                    cars.push(car);
                }
            } else {
                car.id = 'car_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                car.createdAt = new Date().toISOString();
                car.updatedAt = car.createdAt;
                cars.push(car);
            }
            this._write(cars);
            window.dispatchEvent(new CustomEvent('garage-changed'));
            return car;
        },

        /** Smaže auto podle ID */
        remove: function (id) {
            var cars = this._read().filter(function (c) { return c.id !== id; });
            this._write(cars);
            window.dispatchEvent(new CustomEvent('garage-changed'));
        },

        /** Najde existující auto podle brand+model+year (pro deduplikaci) */
        findMatch: function (brand, model, year, vin) {
            var normalizedVin = normalizeVinValue(vin);
            return this._read().find(function (c) {
                var storedVin = normalizeVinValue(c.vin);
                if (normalizedVin) {
                    return storedVin && storedVin === normalizedVin;
                }
                return !storedVin && c.brand === brand && c.model === model && String(c.year) === String(year);
            }) || null;
        },

        /** Sestaví objekt auta z formulářových polí */
        gatherCar: function (fieldIds, checkboxName) {
            var car = {};
            fieldIds.forEach(function (id) {
                var el = document.getElementById(id);
                if (el) car[id] = el.value;
            });
            if (checkboxName) {
                car._equipment = Array.from(
                    document.querySelectorAll('input[name="' + checkboxName + '"]:checked')
                ).map(function (cb) { return cb.value; });
            }
            return car;
        },

        /** Vyplní formulář z dat auta */
        fillFormFromCar: function (car, fieldIds, checkboxName, brandSelect) {
            if (!car) return;
            // Nejprve nastavit brand a počkat na change event
            if (car.brand && brandSelect) {
                brandSelect.value = car.brand;
                brandSelect.dispatchEvent(new Event('change'));
            }
            setTimeout(function () {
                fieldIds.forEach(function (id) {
                    var el = document.getElementById(id);
                    if (el && car[id] !== undefined && car[id] !== '') {
                        el.value = car[id];
                        if (el.tagName === 'SELECT') {
                            el.dispatchEvent(new Event('change'));
                        }
                    }
                });
                if (checkboxName && car._equipment) {
                    // Nejprve odškrtni vše
                    document.querySelectorAll('input[name="' + checkboxName + '"]').forEach(function (cb) {
                        cb.checked = false;
                    });
                    car._equipment.forEach(function (val) {
                        var cb = document.querySelector('input[name="' + checkboxName + '"][value="' + val + '"]');
                        if (cb) cb.checked = true;
                    });
                }
            }, 80);
        },

        /** Vrátí zobrazitelný label pro auto */
        getLabel: function (car) {
            var parts = [];
            if (car.brand) parts.push(car.brand);
            if (car.model) parts.push(car.model);
            if (car.year) parts.push('(' + car.year + ')');
            return parts.join(' ') || 'Neznámé auto';
        },

        /** Vrátí krátký detail string */
        getDetail: function (car) {
            var parts = [];
            if (car.mileage) parts.push(parseInt(car.mileage, 10).toLocaleString('cs-CZ') + ' km');
            if (car.fuelType) parts.push(car.fuelType);
            if (car.transmission) parts.push(car.transmission);
            if (car.powerKw) parts.push(car.powerKw + ' kW');
            if (car.vin) parts.push('VIN ' + normalizeVinValue(car.vin).slice(-8));
            return parts.join(' · ');
        }
    };

    window.AutoCenyShared = {
        /** Uloží data auta do sessionStorage */
        save: function (data) {
            try {
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            } catch (e) { /* ignore */ }
        },

        /** Načte data auta ze sessionStorage */
        load: function () {
            try {
                var raw = sessionStorage.getItem(STORAGE_KEY);
                return raw ? JSON.parse(raw) : null;
            } catch (e) {
                return null;
            }
        },

        /** Vymaže sdílená data */
        clear: function () {
            try {
                sessionStorage.removeItem(STORAGE_KEY);
            } catch (e) { /* ignore */ }
        },

        /** Posbírá hodnoty formulářových polí (inputy, selecty, textarey, checkboxy) */
        gatherFromForm: function (fieldIds, checkboxName) {
            var data = {};
            fieldIds.forEach(function (id) {
                var el = document.getElementById(id);
                if (el) data[id] = el.value;
            });
            if (checkboxName) {
                data._equipment = Array.from(
                    document.querySelectorAll('input[name="' + checkboxName + '"]:checked')
                ).map(function (cb) { return cb.value; });
            }
            return data;
        },

        /** Vyplní formulář z dat */
        fillForm: function (data, fieldIds, checkboxName) {
            if (!data) return;
            fieldIds.forEach(function (id) {
                var el = document.getElementById(id);
                if (el && data[id] !== undefined && data[id] !== '') {
                    el.value = data[id];
                    // Trigger change pro selecty (kvůli brand→model)
                    if (el.tagName === 'SELECT') {
                        el.dispatchEvent(new Event('change'));
                    }
                }
            });
            // Checkboxy
            if (checkboxName && data._equipment) {
                data._equipment.forEach(function (val) {
                    var cb = document.querySelector('input[name="' + checkboxName + '"][value="' + val + '"]');
                    if (cb) cb.checked = true;
                });
            }
        }
    };

    window.CarGarage = CarGarage;

    // ===== Token Usage Tracker =====
    var PROFILE_KEY = 'autoai_profile';
    var USAGE_KEY = 'autoai_token_usage';
    var SETTINGS_KEY = 'autoai_settings';

    var TokenTracker = {
        _readUsage: function () {
            try { return JSON.parse(localStorage.getItem(USAGE_KEY)) || { entries: [], totalInput: 0, totalOutput: 0 }; }
            catch (e) { return { entries: [], totalInput: 0, totalOutput: 0 }; }
        },

        _writeUsage: function (data) {
            try { localStorage.setItem(USAGE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
        },

        /** Zaznamenaj spotřebu tokenů z API odpovědi */
        record: function (source, apiResponse) {
            var usage = apiResponse && apiResponse.usage ? apiResponse.usage : {};
            var inputTokens = usage.input_tokens || 0;
            var outputTokens = usage.output_tokens || 0;
            var model = apiResponse && apiResponse.model ? apiResponse.model : 'unknown';

            var data = this._readUsage();
            var entry = {
                timestamp: Date.now(),
                source: source,        // 'monitor', 'skaut', 'ceny', 'popisky'
                model: model,
                inputTokens: inputTokens,
                outputTokens: outputTokens,
                totalTokens: inputTokens + outputTokens
            };
            data.entries.push(entry);
            data.totalInput += inputTokens;
            data.totalOutput += outputTokens;

            // Uchovat max 500 záznamů
            if (data.entries.length > 500) {
                data.entries = data.entries.slice(-500);
            }
            this._writeUsage(data);
            window.dispatchEvent(new CustomEvent('usage-changed'));
            return entry;
        },

        /** Vrátí celkovou spotřebu */
        getTotal: function () {
            var data = this._readUsage();
            return { input: data.totalInput, output: data.totalOutput, total: data.totalInput + data.totalOutput };
        },

        /** Vrátí spotřebu za aktuální měsíc */
        getMonthly: function () {
            var data = this._readUsage();
            var now = new Date();
            var monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
            var input = 0, output = 0, count = 0;
            for (var i = 0; i < data.entries.length; i++) {
                if (data.entries[i].timestamp >= monthStart) {
                    input += data.entries[i].inputTokens;
                    output += data.entries[i].outputTokens;
                    count++;
                }
            }
            return { input: input, output: output, total: input + output, requests: count };
        },

        /** Vrátí spotřebu za zdroj (monitor/skaut) za aktuální měsíc */
        getMonthlyBySource: function (source) {
            var data = this._readUsage();
            var now = new Date();
            var monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
            var input = 0, output = 0, count = 0;
            for (var i = 0; i < data.entries.length; i++) {
                var e = data.entries[i];
                if (e.timestamp >= monthStart && e.source === source) {
                    input += e.inputTokens;
                    output += e.outputTokens;
                    count++;
                }
            }
            return { input: input, output: output, total: input + output, requests: count };
        },

        /** Vrátí posledních N záznamů */
        getRecent: function (n) {
            var data = this._readUsage();
            return data.entries.slice(-(n || 20));
        },

        /** Vymaže vše */
        reset: function () {
            this._writeUsage({ entries: [], totalInput: 0, totalOutput: 0 });
            window.dispatchEvent(new CustomEvent('usage-changed'));
        },

        /** Formátuje počet tokenů čitelně */
        formatTokens: function (n) {
            if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
            if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
            return String(n);
        },

        /** Přibližný odhad nákladů v USD */
        estimateCost: function (inputTokens, outputTokens, model) {
            // Přibližné ceny za 1M tokenů (2025)
            var prices = {
                'claude-haiku-4-5': { input: 1.0, output: 5.0 },
                'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
                'claude-opus-4-6': { input: 15.0, output: 75.0 }
            };
            var p = prices[model] || prices['claude-opus-4-6'];
            return (inputTokens / 1000000) * p.input + (outputTokens / 1000000) * p.output;
        }
    };

    // ===== Nastavení (frekvence, rozpočet) =====
    var Settings = {
        _read: function () {
            try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; }
            catch (e) { return {}; }
        },

        _write: function (data) {
            try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
        },

        get: function (key, defaultVal) {
            var data = this._read();
            return data[key] !== undefined ? data[key] : defaultVal;
        },

        set: function (key, value) {
            var data = this._read();
            data[key] = value;
            this._write(data);
        }
    };

    // ===== Profil (firma, weby, import vozů) =====
    var ProfileHub = {
        _read: function () {
            try {
                return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {
                    companyName: '',
                    contactEmail: '',
                    websites: [],
                    importedCars: [],
                    lastImportAt: 0,
                    emailEnabled: false,
                    emailFrequency: 'weekly'
                };
            } catch (e) {
                return {
                    companyName: '',
                    contactEmail: '',
                    websites: [],
                    importedCars: [],
                    lastImportAt: 0,
                    emailEnabled: false,
                    emailFrequency: 'weekly'
                };
            }
        },

        _write: function (profile) {
            try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch (e) { /* ignore */ }
        },

        get: function () {
            return this._read();
        },

        save: function (next) {
            var base = this._read();
            var profile = {
                companyName: next.companyName !== undefined ? next.companyName : base.companyName,
                contactEmail: next.contactEmail !== undefined ? next.contactEmail : base.contactEmail,
                websites: Array.isArray(next.websites) ? next.websites : base.websites,
                importedCars: Array.isArray(next.importedCars) ? next.importedCars : base.importedCars,
                lastImportAt: next.lastImportAt !== undefined ? next.lastImportAt : base.lastImportAt,
                emailEnabled: next.emailEnabled !== undefined ? !!next.emailEnabled : !!base.emailEnabled,
                emailFrequency: next.emailFrequency !== undefined ? next.emailFrequency : base.emailFrequency
            };
            this._write(profile);
            window.dispatchEvent(new CustomEvent('profile-changed'));
            return profile;
        },

        setWebsites: function (websites) {
            return this.save({ websites: (websites || []).filter(Boolean) });
        },

        setImportedCars: function (cars) {
            return this.save({ importedCars: Array.isArray(cars) ? cars : [], lastImportAt: Date.now() });
        },

        addImportedCarsToGarage: function () {
            var profile = this._read();
            var imported = Array.isArray(profile.importedCars) ? profile.importedCars : [];
            var added = 0;

            imported.forEach(function (car) {
                if (!car.brand || !car.model || !car.year) return;
                var existing = CarGarage.findMatch(car.brand, car.model, car.year);
                if (existing) return;

                CarGarage.save({
                    brand: car.brand,
                    model: car.model,
                    year: car.year,
                    mileage: car.mileage || '',
                    fuelType: car.fuel || '',
                    transmission: car.transmission || '',
                    price: car.price || '',
                    sourceUrl: car.url || '',
                    sourceSite: car.sourceSite || ''
                });
                added++;
            });

            return added;
        }
    };

    var AnthropicGateway = {
        call: async function (requestBody) {
            var payload = Object.assign({}, requestBody || {});
            var response = await fetch('/api/anthropic', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                var err = {};
                try { err = await response.json(); } catch (e) { /* ignore */ }
                throw new Error('API chyba ' + response.status + ': ' + (((err.error && err.error.message) || err.message) || response.statusText));
            }

            return response.json();
        }
    };

    window.TokenTracker = TokenTracker;
    window.AutoAISettings = Settings;
    window.ProfileHub = ProfileHub;
    window.AutoAIAnthropic = AnthropicGateway;
})();
