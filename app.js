import { AuthService } from "./auth.js";
import { DBService } from "./db.js";

class App {
    constructor() {
        this.currentUser = null;
        this.userData = null;
        this.currentCourse = null;
        this.tempSections = [];
        this.init();
        this.initTheme();
    }

    init() {
        AuthService.onAuthChange(async (user) => {
            this.currentUser = user;
            if (user) {
                this.userData = await AuthService.getUserData(user.uid);
                this.updateUIForAuth();
            } else {
                this.userData = null;
                this.updateUIForUnauth();
            }
            this.handleRouting();
            this.loadCourses();
        });

        window.addEventListener('hashchange', () => this.handleRouting());
        this.setupEventListeners();
    }

    handleRouting() {
        const hash = window.location.hash;
        if (hash.startsWith('#course/')) {
            const slug = hash.replace('#course/', '');
            this.viewCourse(slug);
        } else if (hash === '#home' || !hash) {
            this.showPage('home');
        } else {
            const page = hash.replace('#', '');
            this.showPage(page || 'home');
        }
    }

    updateUIForAuth() {
        document.getElementById('auth-buttons').style.display = 'none';
        document.getElementById('user-profile').style.display = 'flex';
        document.getElementById('user-email').textContent = this.currentUser.email;
        document.getElementById('nav-my-courses').style.display = 'block';

        if (this.userData?.isAdmin) {
            document.getElementById('nav-admin').style.display = 'block';
        }
    }

    updateUIForUnauth() {
        document.getElementById('auth-buttons').style.display = 'flex';
        document.getElementById('user-profile').style.display = 'none';
        document.getElementById('nav-my-courses').style.display = 'none';
        document.getElementById('nav-admin').style.display = 'none';
        this.showPage('home');
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.getAttribute('data-page');
                window.location.hash = page;
            });
        });

        // Auth Modal Triggers
        document.getElementById('btn-login-trigger').onclick = () => this.toggleModal('auth-modal', true);
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.onclick = () => this.toggleModal(btn.closest('.modal').id, false);
        });

        // Auth Toggle (Login/Register)
        const authToggle = document.getElementById('auth-toggle-checkbox');
        authToggle.onchange = () => {
            const isRegister = authToggle.checked;
            document.getElementById('register-fields').style.display = isRegister ? 'block' : 'none';
            document.getElementById('btn-auth-submit').textContent = isRegister ? 'Создать аккаунт' : 'Войти';
        };

        // Auth Forms
        document.getElementById('auth-form').onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            const isRegister = authToggle.checked;

            try {
                if (isRegister) {
                    const name = document.getElementById('auth-name').value;
                    await AuthService.register(email, password, name);
                    this.notify('Аккаунт успешно создан!', 'success');
                } else {
                    await AuthService.login(email, password);
                    this.notify('Вы успешно вошли!', 'success');
                }
                this.toggleModal('auth-modal', false);
            } catch (error) {
                this.notify('Ошибка: ' + error.message, 'error');
            }
        };

        document.getElementById('btn-google-auth').onclick = async () => {
            try {
                await AuthService.loginWithGoogle();
                this.notify('Вход через Google выполнен!', 'success');
                this.toggleModal('auth-modal', false);
            } catch (error) {
                this.notify('Ошибка Google: ' + error.message, 'error');
            }
        };

        document.getElementById('btn-logout').onclick = async () => {
            await AuthService.logout();
            this.notify('Вы вышли из системы', 'success');
        };

        // Admin Forms
        document.getElementById('form-add-course').onsubmit = async (e) => {
            e.preventDefault();
            const title = document.getElementById('course-title').value;
            const slug = document.getElementById('course-slug').value.trim();
            const description = document.getElementById('course-description').value;
            const mainText = document.getElementById('course-main-text').value;
            const price = parseFloat(document.getElementById('course-price').value);
            const file = document.getElementById('course-cover-file').files[0];

            try {
                let coverImageUrl = '';
                if (file) {
                    this.notify('Загрузка обложки...', 'info');
                    coverImageUrl = await DBService.uploadImage(file);
                }

                await DBService.createCourse({
                    title,
                    slug,
                    description,
                    mainText,
                    price,
                    coverImageUrl,
                    sections: this.tempSections
                });
                this.notify('Курс успешно создан!', 'success');
                this.tempSections = [];
                this.renderTempSections();
                e.target.reset();
                this.loadCourses();
                this.loadAdminData();
            } catch (error) {
                this.notify('Ошибка: ' + error.message, 'error');
            }
        };

        // Existing Section Form (Management)
        const addSectionForm = document.getElementById('form-add-section');
        if (addSectionForm) {
            addSectionForm.onsubmit = async (e) => {
                e.preventDefault();
                if (!this.currentEditCourseId) return;

                const title = document.getElementById('section-title').value;
                const content = document.getElementById('section-content').value;

                try {
                    await DBService.addSection(this.currentEditCourseId, { title, content });
                    this.notify('Секция добавлена!', 'success');
                    e.target.reset();
                    this.editCourseSections(this.currentEditCourseId); // Refresh list
                } catch (error) {
                    this.notify('Ошибка: ' + error.message, 'error');
                }
            };
        }

        // Image upload helper in existing section content
        const sectionImgInput = document.getElementById('section-image-file');
        if (sectionImgInput) {
            sectionImgInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                try {
                    this.notify('Загрузка изображения...', 'info');
                    const url = await DBService.uploadImage(file);
                    const markdownImage = `\n![изображение](${url})\n`;
                    document.getElementById('section-content').value += markdownImage;
                    this.notify('Изображение загружено и вставлено!', 'success');
                } catch (error) {
                    this.notify('Ошибка загрузки: ' + error.message, 'error');
                }
            };
        }

        // Main text image upload
        const mainTextImgInput = document.getElementById('main-text-image');
        if (mainTextImgInput) {
            mainTextImgInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                    this.notify('Загрузка изображения...', 'info');
                    const url = await DBService.uploadImage(file);
                    const md = `\n![изображение](${url})\n`;
                    document.getElementById('course-main-text').value += md;
                    this.notify('Изображение вставлено!', 'success');
                } catch (err) {
                    this.notify('Ошибка загрузки: ' + err.message, 'error');
                }
            };
        }

        // Inline section image upload
        const miniImgInput = document.getElementById('mini-section-image');
        if (miniImgInput) {
            miniImgInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                    this.notify('Загрузка изображения...', 'info');
                    const url = await DBService.uploadImage(file);
                    const md = `\n![изображение](${url})\n`;
                    document.getElementById('mini-section-content').value += md;
                    this.notify('Изображение вставлено!', 'success');
                } catch (err) {
                    this.notify('Ошибка загрузки: ' + err.message, 'error');
                }
            };
        }

        // Theme Toggle
        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) {
            themeBtn.onclick = () => this.toggleTheme();
        }
    }

    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            const icon = document.getElementById('theme-icon');
            if (icon) icon.textContent = '☀️';
        }
    }

    toggleTheme() {
        const isDark = document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        const icon = document.getElementById('theme-icon');
        if (icon) icon.textContent = isDark ? '☀️' : '🌙';
        this.notify(isDark ? 'Темная тема включена' : 'Светлая тема включена', 'info');
    }

    async addTempSection() {
        const title = document.getElementById('mini-section-title').value;
        const content = document.getElementById('mini-section-content').value;
        if (!title || !content) {
            this.notify('Заполните заголовок и контент раздела', 'warning');
            return;
        }

        this.tempSections.push({
            title,
            content,
            sectionId: Date.now().toString()
        });

        document.getElementById('mini-section-title').value = '';
        document.getElementById('mini-section-content').value = '';
        this.renderTempSections();
    }

    renderTempSections() {
        const container = document.getElementById('temp-sections-list');
        container.innerHTML = this.tempSections.map((s, i) => `
            <div class="admin-item">
                <span>${i + 1}. ${s.title}</span>
                <button type="button" class="btn btn-outline btn-sm" onclick="app.removeTempSection(${i})">Удалить</button>
            </div>
        `).join('');
    }

    removeTempSection(index) {
        this.tempSections.splice(index, 1);
        this.renderTempSections();
    }

    async loadCourses() {
        const grid = document.getElementById('course-grid');
        grid.innerHTML = '<div class="loader">Загрузка курсов...</div>';

        try {
            const courses = await DBService.getCourses();
            grid.innerHTML = '';
            courses.forEach(course => {
                const card = this.createCourseCard(course);
                grid.appendChild(card);
            });
        } catch (error) {
            grid.innerHTML = '<p>Ошибка при загрузке курсов.</p>';
        }
    }

    createCourseCard(course) {
        const div = document.createElement('div');
        div.className = 'course-card';
        const isFree = course.price === 0;
        const isPurchased = this.userData?.purchasedCourses?.includes(course.id);
        const canStudy = isFree || isPurchased || this.userData?.isAdmin;

        // Progress calculation
        let progressHtml = '';
        if (this.currentUser && canStudy) {
            const completed = this.userData?.progress?.[course.id]?.completedSections?.length || 0;
            const total = (course.sections || []).length;
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
            progressHtml = `
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: ${percentage}%"></div>
                    <span class="progress-text">${percentage}% пройдено</span>
                </div>
            `;
        }

        div.innerHTML = `
            <img src="${course.coverImageUrl || 'https://via.placeholder.com/400x180'}" class="course-cover" alt="${course.title}">
            <div class="course-info">
                <span class="course-badge ${isFree ? 'badge-free' : 'badge-paid'}">${isFree ? 'Бесплатно' : `${course.price} ₽`}</span>
                <h3 class="course-title">${course.title}</h3>
                <p class="course-desc">${course.description}</p>
                ${progressHtml}
                <div class="card-footer">
                    ${canStudy ?
                `<button class="btn btn-primary btn-block" onclick="app.startCourse('${course.id}', '${course.slug || course.id}')">${isPurchased ? 'Продолжить обучение' : 'Начать обучение'}</button>` :
                `<button class="btn btn-outline btn-block" onclick="app.handlePayment('${course.id}')">${this.currentUser ? 'Купить' : 'Войдите, чтобы купить'}</button>`
            }
                </div>
            </div>
        `;
        return div;
    }

    async startCourse(courseId, slug) {
        if (!this.currentUser) {
            this.toggleModal('auth-modal', true);
            return;
        }

        try {
            // Ensure userData exists
            if (!this.userData) {
                this.userData = await AuthService.getUserData(this.currentUser.uid);
            }

            // Auto-add to My Courses if not already there
            const purchased = this.userData?.purchasedCourses || [];
            if (!purchased.includes(courseId)) {
                purchased.push(courseId);
                // Update user doc in Firestore
                const { doc, db, updateDoc } = await import("./firebase-config.js");
                const userRef = doc(db, "users", this.currentUser.uid);
                await updateDoc(userRef, { purchasedCourses: purchased });
                this.userData.purchasedCourses = purchased;
            }

            window.location.hash = `course/${slug}`;
        } catch (error) {
            console.error("Error starting course:", error);
            this.notify("Ошибка при запуске курса", "error");
        }
    }

    async viewCourse(param) {
        this.showPage('course-details');
        const viewer = document.getElementById('course-content-viewer');
        viewer.innerHTML = '<div class="loader">Загрузка контента...</div>';

        try {
            let course = await DBService.getCourseBySlug(param);
            if (!course) course = await DBService.getCourse(param); // Fallback to ID

            if (!course) {
                viewer.innerHTML = '<p>Курс не найден.</p>';
                return;
            }

            const courseId = course.id;
            const isPurchased = this.userData?.purchasedCourses?.includes(courseId);
            const canStudy = (course.price === 0) || isPurchased || this.userData?.isAdmin;

            if (!this.currentUser || !canStudy) {
                viewer.innerHTML = `
                    <div class="course-header-detail guest-view">
                        <img src="${course.coverImageUrl || 'https://via.placeholder.com/800x400'}" class="course-cover-large" alt="${course.title}">
                        <h1>${course.title}</h1>
                        <p class="course-desc-large">${course.description}</p>
                        <div class="guest-overlay">
                            <div class="lock-icon">🔒</div>
                            <h3>Контент доступен после авторизации</h3>
                            <p>Войдите или приобретите курс, чтобы продолжить обучение.</p>
                            <button class="btn btn-primary" onclick="app.toggleModal('auth-modal', true)">Войти в аккаунт</button>
                        </div>
                    </div>
                `;
                return;
            }

            const userProgress = this.userData?.progress?.[courseId]?.completedSections || [];

            viewer.innerHTML = `
                <div class="course-header-detail">
                    <h1>${course.title}</h1>
                    <div class="course-main-text-well">
                        ${this.renderContent(course.mainText || course.description)}
                    </div>
                </div>
                <div class="course-sections">
                    <h2 class="sections-title">Содержание курса</h2>
                    ${(course.sections || []).map((section, index) => `
                        <div class="section-block ${userProgress.includes(section.sectionId) ? 'completed' : ''}" id="section-${section.sectionId}">
                            <div class="section-header">
                                <h3>Раздел ${index + 1}: ${section.title}</h3>
                                <div class="progress-status">
                                    ${userProgress.includes(section.sectionId) ?
                    '<span class="check-done">✓ Пройдено</span>' :
                    `<button class="btn btn-outline btn-sm" onclick="app.completeSection('${courseId}', '${section.sectionId}')">Отметить как пройденное</button>`
                }
                                </div>
                            </div>
                            <div class="section-body">
                                ${this.renderContent(section.content)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            // Resume Logic: scroll to saved position or first uncompleted section
            setTimeout(() => {
                const savedScroll = this.userData?.progress?.[courseId]?.scrollPosition;
                if (savedScroll !== undefined) {
                    window.scrollTo({ top: savedScroll, behavior: 'smooth' });
                } else {
                    const uncompleted = (course.sections || []).find(s => !userProgress.includes(s.sectionId));
                    if (uncompleted) {
                        const el = document.getElementById(`section-${uncompleted.sectionId}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else if (userProgress.length > 0) {
                        const lastId = userProgress[userProgress.length - 1];
                        const el = document.getElementById(`section-${lastId}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }, 500);

            // Track scroll position
            if (this.scrollListener) window.removeEventListener('scroll', this.scrollListener);

            this.scrollListener = this.debounce(() => {
                if (window.location.hash.startsWith('#course/')) {
                    DBService.saveScrollPosition(this.currentUser.uid, courseId, window.scrollY);
                }
            }, 1000);

            window.addEventListener('scroll', this.scrollListener);

        } catch (error) {
            console.error(error);
            viewer.innerHTML = '<p>Ошибка загрузки деталей курса.</p>';
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    renderContent(content) {
        if (!content) return '';
        // Simple markdown-to-html replacement for images
        let html = content.replace(/!\[.*?\]\((.*?)\)/g, '<div class="content-image-wrapper"><img src="$1" class="content-image" alt="изображение"></div>');
        // Simple nl2br
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    async completeSection(courseId, sectionId) {
        try {
            await DBService.updateProgress(this.currentUser.uid, courseId, sectionId);
            this.notify('Прогресс сохранен!', 'success');
            // Refresh user data
            this.userData = await AuthService.getUserData(this.currentUser.uid);
            // Re-render viewer (keeping the slug in param if we had it, but courseId works too)
            this.viewCourse(courseId);
        } catch (error) {
            this.notify('Не удалось сохранить прогресс', 'error');
        }
    }

    handlePayment(courseId) {
        if (!this.currentUser) {
            this.toggleModal('auth-modal', true);
            return;
        }
        // Mock payment
        if (confirm("Имитация оплаты: Подтвердить покупку курса?")) {
            this.notify("Симуляция Stripe оплаты...", "info");
            setTimeout(async () => {
                const purchased = this.userData.purchasedCourses || [];
                if (!purchased.includes(courseId)) {
                    purchased.push(courseId);
                    import("./firebase-config.js").then(async ({ doc, db, updateDoc }) => {
                        const userRef = doc(db, "users", this.currentUser.uid);
                        await updateDoc(userRef, { purchasedCourses: purchased });
                        this.userData.purchasedCourses = purchased;
                        this.notify("Оплата прошла успешно! Курс разблокирован.", "success");
                        this.loadCourses();
                    });
                }
            }, 1000);
        }
    }

    showPage(pageId) {
        if (this.scrollListener) {
            window.removeEventListener('scroll', this.scrollListener);
            this.scrollListener = null;
        }
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const targetPage = document.getElementById(`page-${pageId}`);
        if (targetPage) targetPage.classList.add('active');

        document.querySelectorAll('.nav-link').forEach(l => {
            if (l.getAttribute('data-page') === pageId) l.classList.add('active');
            else l.classList.remove('active');
        });

        if (pageId === 'admin') this.loadAdminData();
        if (pageId === 'courses') this.loadMyCourses();
        window.scrollTo(0, 0);
    }

    async loadMyCourses() {
        const grid = document.getElementById('my-courses-grid');
        if (!grid) return;
        grid.innerHTML = '<div class="loader">Загрузка ваших курсов...</div>';

        try {
            const allCourses = await DBService.getCourses();
            const purchasedIds = this.userData?.purchasedCourses || [];
            const myCourses = allCourses.filter(c => purchasedIds.includes(c.id));

            grid.innerHTML = '';
            if (myCourses.length === 0) {
                grid.innerHTML = '<p class="full-width" style="text-align: center; grid-column: 1/-1; padding: 40px; color: var(--text-muted);">У вас пока нет начатых курсов. <a href="#home" style="color: var(--primary); font-weight: 600;">Выбрать курс</a></p>';
                return;
            }

            myCourses.forEach(course => {
                const card = this.createCourseCard(course);
                grid.appendChild(card);
            });
        } catch (error) {
            console.error(error);
            grid.innerHTML = '<p>Ошибка при загрузке ваших курсов.</p>';
        }
    }

    toggleModal(modalId, show) {
        document.getElementById(modalId).classList.toggle('active', show);
    }

    notify(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;
        const div = document.createElement('div');
        div.className = `notification ${type}`;
        div.textContent = message;
        container.appendChild(div);
        setTimeout(() => div.remove(), 4000);
    }

    // Admin Panel Logic
    async loadAdminData() {
        if (!this.userData?.isAdmin) return;

        // Load courses list for management
        const listContainer = document.getElementById('admin-courses-list');
        listContainer.innerHTML = 'Загрузка...';
        const courses = await DBService.getCourses();
        listContainer.innerHTML = '';
        courses.forEach(c => {
            const item = document.createElement('div');
            item.className = 'admin-item';
            item.innerHTML = `
                <span>${c.title} (${c.sections?.length || 0} разделов)</span>
                <button class="btn btn-outline btn-sm" onclick="app.editCourseSections('${c.id}')">Управление разделами</button>
            `;
            listContainer.appendChild(item);
        });

        // Load users progress
        const usersList = document.getElementById('admin-users-list');
        if (usersList) {
            usersList.innerHTML = 'Загрузка...';
            const users = await DBService.getAllUsers();
            usersList.innerHTML = '';
            users.forEach(u => {
                const item = document.createElement('div');
                item.className = 'admin-item';
                const progressCount = Object.keys(u.progress || {}).length;
                item.innerHTML = `
                    <div>
                        <strong>${u.name || u.email}</strong><br>
                        <small>${u.email} | Начатo курсов: ${progressCount}</small>
                    </div>
                    <span>${u.isAdmin ? 'Админ' : 'Студент'}</span>
                `;
                usersList.appendChild(item);
            });
        }
    }

    async editCourseSections(courseId) {
        this.currentEditCourseId = courseId;
        const container = document.getElementById('section-editor-container');
        container.style.display = 'block';

        const course = await DBService.getCourse(courseId);
        document.getElementById('current-edit-course-title').textContent = course.title;

        const list = document.getElementById('sections-list');
        list.innerHTML = '';
        (course.sections || []).forEach((s, i) => {
            const item = document.createElement('div');
            item.className = 'admin-item';
            item.innerHTML = `
                <span>${i + 1}. ${s.title}</span>
                <button class="btn btn-outline btn-sm" onclick="app.deleteSection('${courseId}', '${s.sectionId}')">Удалить</button>
            `;
            list.appendChild(item);
        });

        container.scrollIntoView({ behavior: 'smooth' });
    }

    async deleteSection(courseId, sectionId) {
        if (!confirm("Вы уверены?")) return;
        try {
            const course = await DBService.getCourse(courseId);
            const sections = course.sections.filter(s => s.sectionId !== sectionId);
            await DBService.updateCourse(courseId, { sections });
            this.notify("Раздел удален", "success");
            this.editCourseSections(courseId);
        } catch (error) {
            this.notify("Ошибка при удалении раздела", "error");
        }
    }
}

// Global instance for inline onclicks
window.app = new App();
export default window.app;
