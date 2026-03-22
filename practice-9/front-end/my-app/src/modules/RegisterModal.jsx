import { useState, useEffect } from "react";
import { api } from "../api/api.js";

function RegisterModal({ isOpen, onClose, onSwitchToLogin, onRegisterSuccess }) {
    const [form, setForm] = useState({
        email: "",
        first_name: "",
        last_name: "",
        password: ""
    });
    const [error, setError] = useState("");

    // Сбрасываем форму и ошибки при открытии/закрытии
    useEffect(() => {
        if (!isOpen) {
            setForm({
                email: "",
                first_name: "",
                last_name: "",
                password: ""
            });
            setError("");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!form.email || !form.first_name || !form.last_name || !form.password) {
            setError("Все поля обязательны");
            return;
        }

        try {
            await api.register(form);
            if (onRegisterSuccess) onRegisterSuccess();
            onClose();
        } catch (err) {
            setError("Ошибка регистрации или email уже занят");
        }
    };

    return (
        <div className="modal_overlay">
            <div className="modal">
                <h2>Регистрация</h2>
                {error && <p className="error">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <input
                        name="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={handleChange}
                    />
                    <input
                        name="first_name"
                        placeholder="Имя"
                        value={form.first_name}
                        onChange={handleChange}
                    />
                    <input
                        name="last_name"
                        placeholder="Фамилия"
                        value={form.last_name}
                        onChange={handleChange}
                    />
                    <input
                        type="password"
                        name="password"
                        placeholder="Пароль"
                        value={form.password}
                        onChange={handleChange}
                    />
                    <div className="modal_actions">
                        <button type="submit">Зарегистрироваться</button>
                        <button type="button" onClick={onClose}>Отмена</button>
                    </div>
                </form>
                <div style={{ marginTop: "10px" }}>
                    <span>Уже есть аккаунт? </span>
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            if (onSwitchToLogin) onSwitchToLogin();
                        }}
                    >
                        Войти
                    </button>
                </div>
            </div>
        </div>
    );
}

export default RegisterModal;