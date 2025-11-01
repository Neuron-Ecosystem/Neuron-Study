// Переменные auth и db доступны здесь, потому что они инициализированы в index.html!

// --- Ссылки на HTML-элементы ---
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

// --- 1. АУТЕНТИФИКАЦИЯ (ВХОД/РЕГИСТРАЦИЯ/ВЫХОД) ---

// Функция для обработки ошибок
const handleError = (error) => {
    console.error(error);
    authMessage.textContent = 'Ошибка: ' + error.message;
};

// РЕГИСТРАЦИЯ
registerButton.addEventListener('click', () => {
    auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
        .catch(handleError);
});

// ВХОД
loginButton.addEventListener('click', () => {
    auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
        .catch(handleError);
});

// ВЫХОД
logoutButton.addEventListener('click', () => {
    auth.signOut();
    authMessage.textContent = 'Вы успешно вышли.';
});

// --- 2. ОТСЛЕЖИВАНИЕ СОСТОЯНИЯ (САМОЕ ВАЖНОЕ) ---
auth.onAuthStateChanged((user) => {
    if (user) {
        // Пользователь вошел. Показываем приложение.
        authContainer.style.display = 'none';
        appContent.style.display = 'block';
        userEmailSpan.textContent = user.email;
        authMessage.textContent = '';
    } else {
        // Пользователь вышел. Показываем форму входа.
        authContainer.style.display = 'block';
        appContent.style.display = 'none';
    }
});

// --- 3. БАЗА ДАННЫХ (СОХРАНЕНИЕ ЗАМЕТКИ) ---
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
