import { useState, useEffect } from "react";
import { api } from "../api/api.js";

function LoginModal({ isOpen, onClose, onSwitchToRegister, onLoginSuccess }) {
    const [form, setForm] = useState({ email: "", password: "" });
    const [error, setError] = useState("");

    // Сбрасываем форму и ошибки при открытии/закрытии
    useEffect(() => {
        if (!isOpen) {
            setForm({ email: "", password: "" });
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

        if (!form.email || !form.password) {
            setError("Все поля обязательны");
            return;
        }

        try {
            const res = await api.login(form);
            if (onLoginSuccess) onLoginSuccess(res);
            onClose();
        } catch (err) {
            setError("Неверный email или пароль");
        }
    };

    return (
        <div className="modal_overlay">
            <div className="modal">
                <h2>Вход</h2>
                {error && <p className="error">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <input
                        name="email"
                        placeholder="Email"
                        value={form.email}
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
                        <button type="submit">Войти</button>
                        <button type="button" onClick={onClose}>Отмена</button>
                    </div>
                </form>
                <div style={{ marginTop: "10px" }}>
                    <span>Нет аккаунта? </span>
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            if (onSwitchToRegister) onSwitchToRegister();
                        }}
                    >
                        Зарегистрироваться
                    </button>
                </div>
            </div>
        </div>
    );
}

export default LoginModal;