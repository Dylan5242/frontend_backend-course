import { useEffect, useState } from "react";
import { api } from "./api/api.js";
import "./App.css";
import ProductCard from "./modules/ProductCard";
import ProductModal from "./modules/ProductModal";
import LoginModal from "./modules/LoginModal";
import RegisterModal from "./modules/RegisterModal";

function App() {

    // ===== ПРОДУКТЫ =====
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingProduct, setEditingProduct] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // ===== АВТОРИЗАЦИЯ =====
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [user, setUser] = useState(null);

    // ===== МОДАЛКИ =====
    const openLoginModal = () => {
        setIsLoginModalOpen(true);
        setIsRegisterModalOpen(false);
    };

    const openRegisterModal = () => {
        setIsRegisterModalOpen(true);
        setIsLoginModalOpen(false);
    };

    const closeModals = () => {
        setIsLoginModalOpen(false);
        setIsRegisterModalOpen(false);
    };

    const openRegisterFromLogin = () => {
        setIsLoginModalOpen(false);
        setIsRegisterModalOpen(true);
    };

    const openLoginFromRegister = () => {
        setIsRegisterModalOpen(false);
        setIsLoginModalOpen(true);
    };

    // ===== ПРОВЕРКА АВТОРИЗАЦИИ =====
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem("accessToken");
            if (token) {
                try {
                    const me = await api.getMe();
                    setUser(me);
                } catch {
                    localStorage.removeItem("accessToken");
                    localStorage.removeItem("refreshToken");
                }
            }
        };

        checkAuth();
    }, []);

    // ===== ПРОДУКТЫ =====
    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const data = await api.getProducts();
            setProducts(data);
        } catch (err) {
            alert("Ошибка загрузки");
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        const newProduct = {
            title: "Новый товар",
            cost: 1000,
            category: "прочее",
            description: "Описание",
            PICTURE_URL: "https://via.placeholder.com/200",
            amount: 1
        };

        const created = await api.createProduct(newProduct);
        setProducts(prev => [...prev, created]);
    };

    const handleDelete = async (id) => {
        await api.deleteProduct(id);
        setProducts(prev => prev.filter(p => p.id !== id));
    };

    const openCreateModal = () => {
        setEditingProduct(null);
        setIsModalOpen(true);
    };

    const openEditModal = (product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleSave = async (formData) => {
        try {
            if (editingProduct) {
                const updated = await api.updateProduct(editingProduct.id, formData);

                setProducts(prev =>
                    prev.map(p => p.id === editingProduct.id ? updated : p)
                );
            } else {
                const created = await api.createProduct(formData);
                setProducts(prev => [...prev, created]);
            }

            setIsModalOpen(false);
            setEditingProduct(null);

        } catch (err) {
            alert("Ошибка сохранения");
        }
    };

    // ===== ЛОГИН / ЛОГАУТ =====
    const onLoginSuccess = async () => {
        const me = await api.getMe();
        setUser(me);
        closeModals();
    };

    const onRegisterSuccess = () => {
        openLoginModal();
    };

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        setUser(null);
    };

    return (
        <>
            <div className="header">
                <div className="logo">LOGO</div>

                <div className="add_btn">
                    <button onClick={openCreateModal}>Добавить</button>
                </div>

                <div className="login_btn">
                    {user ? (
                        <div style={{ display: "flex", gap: "10px" }}>
                            <span>{user.email}</span>
                            <button onClick={handleLogout}>Выйти</button>
                        </div>
                    ) : (
                        <button onClick={openLoginModal}>Войти</button>
                    )}
                </div>
            </div>

            <div className="body">
                {loading ? (
                    <p>Загрузка...</p>
                ) : (
                    products.map(product => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            onDelete={handleDelete}
                            onEdit={openEditModal}
                        />
                    ))
                )}
            </div>

            <ProductModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                editingProduct={editingProduct}
            />

            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={closeModals}
                onSwitchToRegister={openRegisterFromLogin}
                onLoginSuccess={onLoginSuccess}
            />

            <RegisterModal
                isOpen={isRegisterModalOpen}
                onClose={closeModals}
                onSwitchToLogin={openLoginFromRegister}
                onRegisterSuccess={onRegisterSuccess}
            />
        </>
    );
}

export default App;