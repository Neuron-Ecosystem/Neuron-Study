// Переменные auth и db доступны здесь, потому что они инициализированы в index.html!

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Ссылки на HTML-элементы ---
    // Элементы формы
    const authContainer = document.getElementById('auth-container');
    const appContent = document.getElementById('app-content');
    const userEmailSpan = document.getElementById('userEmail');
    const authMessage = document.getElementById('authMessage');

    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const registerButton = document.getElementById('registerButton');
    const loginButton = document.getElementById('loginButton');
    const logoutButton = document.getElementById('logoutButton');
    const saveNoteButton = document.getElementById('saveNoteButton');
    
    // НОВАЯ кнопка в навигации
    const mainAuthButton = document.getElementById('mainAuthButton'); 
    
    // Элементы PWA
    const installBtn = document.getElementById('installBtn');

    // --- 1. АУТЕНТИФИКАЦИЯ (ВХОД/РЕГИСТРАЦИЯ/ВЫХОД) ---

    // Функция для обработки ошибок
    const handleError = (error) => {
        console.error(error);
        authMessage.textContent = 'Ошибка: ' + error.message;
    };

    // РЕГИСТРАЦИЯ
    if (registerButton) {
        registerButton.addEventListener('click', () => {
            auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
                .catch(handleError);
        });
    }

    // ВХОД
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
                .catch(handleError);
        });
    }

    // ВЫХОД
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            auth.signOut();
            authMessage.textContent = 'Вы успешно вышли.';
        });
    }

    // НОВЫЙ обработчик для главной кнопки в навигации
    if (mainAuthButton) {
        mainAuthButton.addEventListener('click', () => {
            // Если пользователь вошел, кнопка 'Выйти' ( signOut() ), 
            // иначе показываем форму входа.
            if (auth.currentUser) {
                auth.signOut();
            } else {
                // Показываем форму входа
                authContainer.style.display = 'block';
                // Скрываем главную кнопку, пока форма активна (опционально)
                mainAuthButton.style.display = 'none'; 
            }
        });
    }

    // --- 2. ОТСЛЕЖИВАНИЕ СОСТОЯНИЯ (САМОЕ ВАЖНОЕ) ---
    auth.onAuthStateChanged((user) => {
        if (user) {
            // Пользователь вошел. Показываем приложение.
            authContainer.style.display = 'none';
            appContent.style.display = 'block';
            userEmailSpan.textContent = user.email;
            authMessage.textContent = '';
            // Обновляем текст кнопки навигации
            if (mainAuthButton) {
                 mainAuthButton.textContent = 'Выйти'; 
                 mainAuthButton.style.display = 'block'; // Показываем кнопку 'Выйти'
            }
        } else {
            // Пользователь вышел. Показываем главную кнопку 'Войти'.
            if (mainAuthButton) {
                mainAuthButton.textContent = 'Войти / Регистрация';
                mainAuthButton.style.display = 'block';
            }
            // Скрываем оба основных блока, чтобы показать только навигацию
            authContainer.style.display = 'none';
            appContent.style.display = 'none';
        }
    });

    // --- 3. БАЗА ДАННЫХ (СОХРАНЕНИЕ ЗАМЕТКИ) ---
    if (saveNoteButton) {
        saveNoteButton.addEventListener('click', () => {
            const user = auth.currentUser;
            if (!user) {
                alert("Пожалуйста, войдите в систему.");
                return;
            }

            const data = {
                title: document.getElementById('noteTitle').value,
                content: document.getElementById('noteContent').value,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Сохраняем данные в коллекцию 'notes' под уникальным ID пользователя
            db.collection("users").doc(user.uid).collection("notes").add(data)
                .then(() => alert("Заметка успешно сохранена! Проверьте Firebase Console."))
                .catch((error) => handleError(error));
        });
    }
});
