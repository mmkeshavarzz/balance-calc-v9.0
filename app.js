/* ╔══════════════════════════════════════════════════════════════╗
   ║  تخمین تراز قلم‌چی — موتور محاسباتی و کنترلر UI            ║
   ║  مدل: v9.0-Stable                                          ║
   ║  فرمول:  T = 4720 + 33.5 × S_w − 16.0 × σ_w               ║
   ╚══════════════════════════════════════════════════════════════╝ */

;(function () {
    'use strict';

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       بخش ۱: تعریف ثوابت و پیکربندی مدل
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

    /** لیست دروس با ID، نام فارسی و وزن مدل */
    const SUBJECTS = [
        { id: 'zist12',   name: 'زیست ۱۲',     weight: 3.2 },
        { id: 'fiz12',    name: 'فیزیک ۱۲',    weight: 2.1 },
        { id: 'shimi12',  name: 'شیمی ۱۲',     weight: 2.5 },
        { id: 'riyazi12', name: 'ریاضی ۱۲',    weight: 2.0 },
        { id: 'zistP',    name: 'زیست پایه',    weight: 2.8 },
        { id: 'fizP',     name: 'فیزیک پایه',   weight: 1.5 },
        { id: 'shimiP',   name: 'شیمی پایه',    weight: 1.8 },
        { id: 'riyaziP',  name: 'ریاضی پایه',   weight: 1.4 },
        { id: 'zamini',   name: 'زمین‌شناسی',    weight: 0.7 }
    ];

    /** ضرایب رگرسیون مدل */
    const MODEL = Object.freeze({
        INTERCEPT:  4720,
        BETA_MEAN:  33.5,
        BETA_STD:  -16.0,
        MIN_TARAZ:  4000,
        MAX_TARAZ:  10000
    });

    /** 
    * ═══════════════════════════════════════════════════════════════
    * 🎯 اهداف دانشگاهی - نسخه کامل با ۶ سطح
    * ═══════════════════════════════════════════════════════════════
    */
    const UNIVERSITY_GOALS = [
        {
            id: 'legendary',
            emoji: '🏆',
            label: 'رویایی',
            taraz: 7200,
            color: '#FFD700',
            universities: ['تهران', 'شهید بهشتی', 'ایران']
        },
        {
            id: 'gold',
            emoji: '🥇', 
            label: 'طلایی',
            taraz: 6700,
            color: '#FFA500',
            universities: ['شیراز', 'اصفهان', 'مشهد']
        },
        {
            id: 'silver',
            emoji: '🥈',
            label: 'نقره‌ای', 
            taraz: 6300,
            color: '#C0C0C0',
            universities: ['کرمان', 'گیلان', 'تبریز', 'اهواز', 'کرمانشاه', 'همدان', 'بابل']
        },
        {
            id: 'bronze',
            emoji: '🥉',
            label: 'برنزی',
            taraz: 5900,
            color: '#CD7F32',
            universities: ['یاسوج', 'بوشهر', 'ایلام', 'ساری', 'یزد', 'ارومیه', 'کاشان', 'زنجان']
        },
        {
            id: 'free',
            emoji: '👻',
            label: 'آزاد/پردیس',
            taraz: 5500,
            color: '#9B59B6',
            universities: ['آزاد', 'پردیس', 'مازاد ظرفیت']
        },
        {
            id: 'home',
            emoji: '🏠',
            label: 'خانه پدری',
            taraz: 5250,
            color: '#E74C3C',
            universities: ['منزل پدری', 'سربازی']
        }
    ];


    /** سطوح تراز با رنگ‌بندی */
    const LEVELS = [
        { min: 7000, label: '🏆 افسانه‌ای!',            css: 'lvl-gold'   },
        { min: 6500, label: '🌟 عالی',                  css: 'lvl-blue'   },
        { min: 6000, label: '✅ خوب',                   css: 'lvl-green'  },
        { min: 5500, label: '⚡ متوسط رو به بالا',      css: 'lvl-yellow' },
        { min: 5000, label: '🟠 متوسط',                 css: 'lvl-orange' },
        { min: 0,    label: '🔴 نیاز به تلاش بیشتر',   css: 'lvl-red'    }
    ];

    /** کلید ذخیره‌سازی محلی */
    const STORAGE_KEY = 'taraz_estimator_data';
    const THEME_KEY   = 'taraz_theme';

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       بخش ۲: توابع محاسباتی مدل (Pure Functions)
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

    /**
     * محاسبه میانگین وزنی
     * @param {number[]} percents — آرایه درصدها (به ترتیب SUBJECTS)
     * @returns {number} S_w — میانگین وزنی
     */
    function calcWeightedMean(percents) {
        let sumWP = 0, sumW = 0;
        for (let i = 0; i < SUBJECTS.length; i++) {
            const p = percents[i];
            if (p === null || isNaN(p)) continue;
            sumWP += SUBJECTS[i].weight * p;
            sumW  += SUBJECTS[i].weight;
        }
        return sumW > 0 ? sumWP / sumW : 0;
    }

    /**
     * محاسبه انحراف معیار وزنی
     * @param {number[]} percents
     * @param {number} wMean — میانگین وزنی از قبل محاسبه‌شده
     * @returns {number} σ_w
     */
    function calcWeightedStd(percents, wMean) {
        let sumW = 0, sumWSq = 0;
        for (let i = 0; i < SUBJECTS.length; i++) {
            const p = percents[i];
            if (p === null || isNaN(p)) continue;
            const diff = p - wMean;
            sumWSq += SUBJECTS[i].weight * diff * diff;
            sumW   += SUBJECTS[i].weight;
        }
        return sumW > 0 ? Math.sqrt(sumWSq / sumW) : 0;
    }

    /**
     * تخمین تراز
     * @param {number[]} percents
     * @returns {{taraz:number, mean:number, std:number}}
     */
    function predict(percents) {
        const mean  = calcWeightedMean(percents);
        const std   = calcWeightedStd(percents, mean);
        let taraz   = MODEL.INTERCEPT + MODEL.BETA_MEAN * mean + MODEL.BETA_STD * std;
        taraz       = Math.round(Math.max(MODEL.MIN_TARAZ, Math.min(MODEL.MAX_TARAZ, taraz)));
        return { taraz, mean, std };
    }

    /**
     * تحلیل حساسیت — تغییر تراز به ازای ±10% هر درس
     * @param {number[]} percents
     * @returns {Array<{id:string, name:string, delta:number}>}
     */
    function sensitivityAnalysis(percents) {
        const base = predict(percents).taraz;
        const results = [];

        for (let i = 0; i < SUBJECTS.length; i++) {
            const p = percents[i];
            if (p === null || isNaN(p)) {
                results.push({ id: SUBJECTS[i].id, name: SUBJECTS[i].name, delta: 0 });
                continue;
            }
            const modified = [...percents];
            modified[i] = Math.min(100, p + 10);
            const newTaraz = predict(modified).taraz;
            results.push({
                id:    SUBJECTS[i].id,
                name:  SUBJECTS[i].name,
                delta: newTaraz - base
            });
        }

        // مرتب‌سازی از بیشترین تأثیر به کمترین
        results.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
        return results;
    }

    /**
     * محاسبه معکوس — برای رسیدن به تراز هدف، چه میانگینی لازمه؟
     * فرض: انحراف معیار ≈ 0 (درصدها یکنواخت)
     * @param {number} targetTaraz
     * @returns {number} درصد میانگین لازم
     */
    function reversePredict(targetTaraz) {
        // T = 4720 + 33.5 * S_w  =>  S_w = (T - 4720) / 33.5
        const needed = (targetTaraz - MODEL.INTERCEPT) / MODEL.BETA_MEAN;
        return Math.round(Math.max(-33, Math.min(100, needed)) * 10) / 10;
    }

    /**
     * شبیه‌سازی — اگر همه درس‌ها X% باشه، تراز چند میشه؟
     * @param {number} uniformPercent
     * @returns {number}
     */
    function simulate(uniformPercent) {
        const percents = SUBJECTS.map(() => uniformPercent);
        return predict(percents).taraz;
    }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       بخش ۳: ابزارهای کمکی
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

    /** تبدیل عدد به رقم فارسی */
    function toPersianDigits(num) {
        const persianDigits = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
        return String(num).replace(/\d/g, d => persianDigits[+d]);
    }

    /** دیبونس — جلوگیری از اجرای مکرر تابع */
    function debounce(fn, ms) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), ms);
        };
    }

    /**
     * انیمیشن شمارش عدد
     * @param {HTMLElement} el
     * @param {number} from
     * @param {number} to
     * @param {number} duration — میلی‌ثانیه
     */
    function animateCount(el, from, to, duration) {
        if (from === to) { el.textContent = toPersianDigits(to); return; }
        const start = performance.now();
        const diff  = to - from;

        function tick(now) {
            const elapsed  = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutQuart
            const eased = 1 - Math.pow(1 - progress, 4);
            const current = Math.round(from + diff * eased);
            el.textContent = toPersianDigits(current);
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    /** تشخیص سطح تراز */
    function getLevel(taraz) {
        for (const lvl of LEVELS) {
            if (taraz >= lvl.min) return lvl;
        }
        return LEVELS[LEVELS.length - 1];
    }

    /** کلاس رنگ مینی بار بر اساس درصد */
    function getMiniBarClass(pct) {
        if (pct === null || isNaN(pct)) return '';
        if (pct < 15)  return 'low';
        if (pct < 35)  return 'medium';
        if (pct < 55)  return 'good';
        if (pct < 75)  return 'great';
        return 'excellent';
    }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       بخش ۴: ذخیره‌سازی محلی (localStorage)
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

    function saveData(percentsObj) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(percentsObj));
        } catch (e) {
            console.warn('خطا در ذخیره‌سازی:', e);
        }
    }

    function loadData() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function clearData() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) { /* عمدی خالی */ }
    }

    function saveTheme(theme) {
        try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* */ }
    }

    function loadTheme() {
        try { return localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { return 'light'; }
    }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       بخش ۵: کنترلر UI — قلب تپنده داشبورد
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

    const UI = {
        /** رفرنس المنت‌ها — بعد از DOM Ready پر میشه */
        els: {},

        /** آخرین تراز نمایش‌داده‌شده برای انیمیشن */
        lastTaraz: 0,

        /** مقداردهی اولیه */
        init() {
            this.cacheElements();
            this.bindEvents();
            this.applyTheme(loadTheme());
            this.restoreInputs();
            this.recalculate();
        },

        /** کش کردن رفرنس المنت‌ها */
        cacheElements() {
            this.els = {
                // اینپوت‌ها
                inputs: {},
                bars: {},

                // نتیجه
                tarazNumber:    document.getElementById('tarazNumber'),
                tarazLabel:     document.getElementById('tarazLabel'),
                levelBadge:     document.getElementById('levelBadge'),
                levelText:      document.getElementById('levelText'),
                resultCard:     document.getElementById('resultCard'),

                // ═══════════════════════════════════════════════════════
                // 🎯 اهداف دانشگاهی - ۶ سطح جدید
                // ═══════════════════════════════════════════════════════
                goalBarLegendary:   document.getElementById('goalBarLegendary'),
                goalBarGold:        document.getElementById('goalBarGold'),
                goalBarSilver:      document.getElementById('goalBarSilver'),
                goalBarBronze:      document.getElementById('goalBarBronze'),
                goalBarFree:        document.getElementById('goalBarFree'),
                goalBarHome:        document.getElementById('goalBarHome'),

                goalLegendary:      document.getElementById('goalLegendary'),
                goalGold:           document.getElementById('goalGold'),
                goalSilver:         document.getElementById('goalSilver'),
                goalBronze:         document.getElementById('goalBronze'),
                goalFree:           document.getElementById('goalFree'),
                goalHome:           document.getElementById('goalHome'),

                goalStatusLegendary: document.getElementById('goalStatusLegendary'),
                goalStatusGold:      document.getElementById('goalStatusGold'),
                goalStatusSilver:    document.getElementById('goalStatusSilver'),
                goalStatusBronze:    document.getElementById('goalStatusBronze'),
                goalStatusFree:      document.getElementById('goalStatusFree'),
                goalStatusHome:      document.getElementById('goalStatusHome'),

                // تحلیل حساسیت
                sensitivityList: document.getElementById('sensitivityList'),

                // معکوس
                reverseTarget:  document.getElementById('reverseTarget'),
                btnReverse:     document.getElementById('btnReverse'),
                reverseResult:  document.getElementById('reverseResult'),

                // شبیه‌سازی
                simPercent:     document.getElementById('simPercent'),
                btnSimulate:    document.getElementById('btnSimulate'),
                simResult:      document.getElementById('simResult'),

                // هدر
                btnTheme:  document.getElementById('btnTheme'),
                btnReset:  document.getElementById('btnReset'),
                btnExport: document.getElementById('btnExport'),
                mainContent: document.getElementById('mainContent')
            };

            // کش اینپوت‌ها و بارها
            for (const subj of SUBJECTS) {
                const inp = document.getElementById('inp-' + subj.id);
                const bar = document.getElementById('bar-' + subj.id);

                if (inp) this.els.inputs[subj.id] = inp;
                if (bar) this.els.bars[subj.id]   = bar;
            }
        },

        /** اتصال رویدادها */
        bindEvents() {
            // رویداد ورودی‌ها — real-time با دیبونس
            const debouncedRecalc = debounce(() => this.recalculate(), 80);

            for (const id in this.els.inputs) {
                const inp = this.els.inputs[id];
                inp.addEventListener('input', () => {
                    this.clampInput(inp);
                    this.updateMiniBar(id);
                    this.saveCurrentInputs();
                    debouncedRecalc();
                });
            }

            // دکمه تم
            if (this.els.btnTheme) {
                this.els.btnTheme.addEventListener('click', () => this.toggleTheme());
            }

            // دکمه ریست
            if (this.els.btnReset) {
                this.els.btnReset.addEventListener('click', () => this.resetAll());
            }

            // دکمه خروجی PNG
            if (this.els.btnExport) {
                this.els.btnExport.addEventListener('click', () => this.exportPNG());
            }

            // محاسبه معکوس
            if (this.els.btnReverse) {
                this.els.btnReverse.addEventListener('click', () => this.doReverse());
            }

            // شبیه‌سازی
            if (this.els.btnSimulate) {
                this.els.btnSimulate.addEventListener('click', () => this.doSimulate());
            }
        },

        /** محدود کردن مقدار اینپوت به بازه مجاز */
        clampInput(inp) {
            let val = parseFloat(inp.value);
            if (isNaN(val)) return;
            if (val < -33)  inp.value = -33;
            if (val > 100)  inp.value = 100;
        },

        /** خواندن درصدها از اینپوت‌ها */
        readPercents() {
            return SUBJECTS.map(subj => {
                const inp = this.els.inputs[subj.id];
                if (!inp || inp.value === '') return null;
                return parseFloat(inp.value);
            });
        },

        /** بروزرسانی مینی بار */
        updateMiniBar(subjectId) {
            const inp = this.els.inputs[subjectId];
            const bar = this.els.bars[subjectId];
            if (!inp || !bar) return;

            const val = parseFloat(inp.value);
            if (isNaN(val) || inp.value === '') {
                bar.style.width = '0%';
                bar.className = 'mini-bar';
                return;
            }

            // تبدیل -33~100 به 0%~100%
            const normalized = ((val + 33) / 133) * 100;
            bar.style.width = Math.max(0, Math.min(100, normalized)) + '%';
            bar.className = 'mini-bar ' + getMiniBarClass(val);
        },

        /** بروزرسانی همه مینی بارها */
        updateAllMiniBars() {
            for (const subj of SUBJECTS) {
                this.updateMiniBar(subj.id);
            }
        },

        /** محاسبه مجدد و بروزرسانی UI */
        recalculate() {
            const percents = this.readPercents();

            // چک کردن: آیا حداقل یک ورودی داریم؟
            const hasInput = percents.some(p => p !== null && !isNaN(p));

            if (!hasInput) {
                this.showEmptyState();
                return;
            }

            // محاسبه تراز
            const result = predict(percents);

            // بروزرسانی عدد تراز با انیمیشن
            animateCount(this.els.tarazNumber, this.lastTaraz, result.taraz, 500);
            this.lastTaraz = result.taraz;

            // برچسب
            const meanStr = toPersianDigits(result.mean.toFixed(1));
            const stdStr  = toPersianDigits(result.std.toFixed(1));
            this.els.tarazLabel.textContent = 'میانگین وزنی: ' + meanStr + '% | انحراف: ' + stdStr;

            // سطح
            const level = getLevel(result.taraz);
            this.els.levelBadge.className = 'level-badge ' + level.css;
            this.els.levelText.textContent = level.label;

            // فعال‌سازی انیمیشن glow
            this.els.resultCard.classList.add('active');

            // اهداف
            this.updateGoals(result.taraz);

            // تحلیل حساسیت
            this.updateSensitivity(percents);
        },

        /** نمایش حالت خالی */
        showEmptyState() {
            this.els.tarazNumber.textContent = '-';
            this.els.tarazLabel.textContent = 'درصدها را وارد کنید';
            this.els.levelBadge.className = 'level-badge';
            this.els.levelText.textContent = 'در انتظار ورودی...';
            this.els.resultCard.classList.remove('active');
            this.lastTaraz = 0;

            // ═══════════════════════════════════════════════════════
            // 🔄 ریست اهداف دانشگاهی - نسخه ۶ سطحی
            // ═══════════════════════════════════════════════════════
            for (const goal of UNIVERSITY_GOALS) {
                // ✅ ساختن ID های صحیح
                const capitalizedId = goal.id.charAt(0).toUpperCase() + goal.id.slice(1);
                const barId = 'goalBar' + capitalizedId;
                const statusId = 'goalStatus' + capitalizedId;
                
                // ریست نوار پیشرفت
                const barEl = document.getElementById(barId);
                if (barEl) {
                    barEl.style.width = '0%';
                    barEl.style.boxShadow = 'none';
                }
                
                // ریست وضعیت
                const statusEl = document.getElementById(statusId);
                if (statusEl) {
                    statusEl.innerHTML = '<span class="goal-waiting">🎯 در انتظار...</span>';
                }
            }


            // ریست حساسیت
            if (this.els.sensitivityList) {
                this.els.sensitivityList.innerHTML = '<div class="empty-state">ابتدا درصدها را وارد کنید</div>';
            }
        },

/** 
* ═══════════════════════════════════════════════════════════════
* 🎯 بروزرسانی نوارهای اهداف دانشگاهی - نسخه ۶ سطحی
* ═══════════════════════════════════════════════════════════════
 * این تابع برای هر ۶ سطح هدف:
 * - نوار پیشرفت رو آپدیت میکنه
 * - وضعیت رسیدن/نرسیدن رو نشون میده
 * - رنگ‌بندی داینامیک اعمال میکنه
 */
updateGoals(taraz) {
    // پیمایش روی آرایه جدید UNIVERSITY_GOALS
    for (const goal of UNIVERSITY_GOALS) {
        // ✅ ساختن ID های صحیح از goal.id
        const capitalizedId = goal.id.charAt(0).toUpperCase() + goal.id.slice(1);
        const barId = 'goalBar' + capitalizedId;
        const statusId = 'goalStatus' + capitalizedId;
        
        // گرفتن المنت‌ها از DOM
        const barEl = document.getElementById(barId);
        const statusEl = document.getElementById(statusId);
        
        // اگه المنت‌ها پیدا نشدن، ادامه بده
        if (!barEl) {
            console.warn('⚠️ المنت ' + barId + ' پیدا نشد!');
            continue;
        }
        
        // محاسبه درصد پیشرفت (حداکثر ۱۰۰٪)
        const progressPercent = Math.min(100, Math.max(0, (taraz / goal.taraz) * 100));
        
        // آپدیت عرض نوار پیشرفت
        barEl.style.width = progressPercent.toFixed(1) + '%';
        
        // تغییر رنگ نوار بر اساس وضعیت
        if (progressPercent >= 100) {
            barEl.style.background = 'linear-gradient(135deg, ' + goal.color + ', ' + goal.color + 'dd)';
            barEl.style.boxShadow = '0 0 15px ' + goal.color + '66';
        } else {
            barEl.style.background = 'linear-gradient(135deg, ' + goal.color + 'cc, ' + goal.color + '88)';
            barEl.style.boxShadow = 'none';
        }
        
        // محاسبه فاصله تا هدف
        const difference = taraz - goal.taraz;
        
        // آپدیت وضعیت (ایموجی و متن)
        if (statusEl) {
            if (difference >= 0) {
                statusEl.innerHTML = '<span class="goal-achieved">✅ +' + toPersianDigits(difference) + '</span>';
            } else if (progressPercent >= 90) {
                statusEl.innerHTML = '<span class="goal-close">🔥 ' + toPersianDigits(Math.abs(difference)) + ' مونده</span>';
            } else {
                statusEl.innerHTML = '<span class="goal-remaining">' + toPersianDigits(Math.abs(difference)) + ' تراز مونده</span>';
            }
        }
    }
},


        /** بروزرسانی لیست تحلیل حساسیت */
        updateSensitivity(percents) {
            const analysis = sensitivityAnalysis(percents);
            const container = this.els.sensitivityList;
            if (!container) return;

            container.innerHTML = '';

            for (const item of analysis) {
                const row = document.createElement('div');
                row.className = 'sens-row';

                const nameSpan = document.createElement('span');
                nameSpan.className = 'sens-name';
                nameSpan.textContent = item.name;

                const valueSpan = document.createElement('span');
                const sign = item.delta > 0 ? '+' : '';
                valueSpan.textContent = sign + toPersianDigits(item.delta);
                valueSpan.className = 'sens-value ' + (item.delta > 0 ? 'positive' : item.delta < 0 ? 'negative' : '');

                row.appendChild(nameSpan);
                row.appendChild(valueSpan);
                container.appendChild(row);
            }
        },

        /** محاسبه معکوس */
        doReverse() {
            const inp = this.els.reverseTarget;
            const out = this.els.reverseResult;
            if (!inp || !out) return;

            const target = parseFloat(inp.value);
            if (isNaN(target) || target < 4000 || target > 10000) {
                out.innerHTML = '<span class="empty-state">تراز باید بین ۴۰۰۰ تا ۱۰۰۰۰ باشه!</span>';
                return;
            }

            const needed = reversePredict(target);
            out.textContent = 'میانگین درصد لازم: ≈ ' + toPersianDigits(needed) + '%';
        },

        /** شبیه‌سازی */
        doSimulate() {
            const inp = this.els.simPercent;
            const out = this.els.simResult;
            if (!inp || !out) return;

            const pct = parseFloat(inp.value);
            if (isNaN(pct) || pct < -33 || pct > 100) {
                out.innerHTML = '<span class="empty-state">درصد باید بین −۳۳ تا ۱۰۰ باشه!</span>';
                return;
            }

            const taraz = simulate(pct);
            out.textContent = 'تراز تخمینی: ≈ ' + toPersianDigits(taraz);
        },

        /** ذخیره اینپوت‌ها در localStorage */
        saveCurrentInputs() {
            const data = {};
            for (const subj of SUBJECTS) {
                const inp = this.els.inputs[subj.id];
                if (inp) data[subj.id] = inp.value;
            }
            saveData(data);
        },

        /** بازیابی اینپوت‌ها از localStorage */
        restoreInputs() {
            const data = loadData();
            if (!data) return;

            for (const subj of SUBJECTS) {
                const inp = this.els.inputs[subj.id];
                if (inp && data[subj.id] !== undefined && data[subj.id] !== '') {
                    inp.value = data[subj.id];
                }
            }
            this.updateAllMiniBars();
        },

        /** پاک کردن همه اینپوت‌ها */
        resetAll() {
            for (const subj of SUBJECTS) {
                const inp = this.els.inputs[subj.id];
                if (inp) inp.value = '';
            }
            this.updateAllMiniBars();
            clearData();
            this.lastTaraz = 0;
            this.recalculate();
        },

        /** تغییر تم */
        toggleTheme() {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            this.applyTheme(next);
        },

        /** اعمال تم */
        applyTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            saveTheme(theme);

            if (this.els.btnTheme) {
                this.els.btnTheme.textContent = theme === 'dark' ? '☀️' : '🌙';
            }
        },

        /** خروجی PNG */
        exportPNG() {
            const target = this.els.mainContent;
            if (!target) return;

            if (typeof html2canvas !== 'function') {
                alert('کتابخانه html2canvas بارگذاری نشده! اتصال اینترنت را چک کنید.');
                return;
            }

            // تغییر موقت دکمه
            const btn = this.els.btnExport;
            if (btn) {
                btn.textContent = '⏳';
                btn.disabled = true;
            }

            html2canvas(target, {
                scale: 2,
                useCORS: true,
                backgroundColor: getComputedStyle(document.body).getPropertyValue('--bg-primary').trim() || '#F5F0EB',
                logging: false
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = 'taraz-estimate.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            }).catch(err => {
                console.error('خطا در خروجی PNG:', err);
                alert('خطا در ساخت تصویر!');
            }).finally(() => {
                if (btn) {
                    btn.textContent = '📸';
                    btn.disabled = false;
                }
            });
        }
    };

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       بخش ۶: اجرای اولیه — وقتی DOM آماده شد
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => UI.init());
    } else {
        UI.init();
    }

//  script.js
// javascript
 
 /* Social Bento Interaction Layer
  (reserved for future animations or analytics)
  Yes… deliberately clean 😎
*/

console.log("🔥 Social Bento Loaded Successfully");


})();
