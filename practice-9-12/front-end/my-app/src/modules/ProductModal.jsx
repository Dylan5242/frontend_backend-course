import { useState, useEffect } from "react";

function ProductModal({ isOpen, onClose, onSave, editingProduct }) {

    const [form, setForm] = useState({
        title: "",
        cost: "",
        description: "",
        category: "",
        PICTURE_URL: "",
        amount: ""
    });

    // если редактирование — заполняем форму
    useEffect(() => {
        if (editingProduct) {
            setForm(editingProduct);
        } else {
            setForm({
                title: "",
                cost: "",
                description: "",
                category: "",
                PICTURE_URL: "",
                amount: ""
            });
        }
    }, [editingProduct]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(form);
    };

    return (
        <div className="modal_overlay">
            <div className="modal">
                <h2>
                    {editingProduct ? "Редактировать товар" : "Добавить товар"}
                </h2>

                <form onSubmit={handleSubmit}>
                    <input name="title" placeholder="Название" value={form.title} onChange={handleChange} />
                    <input name="cost" placeholder="Цена" value={form.cost} onChange={handleChange} />
                    <input name="category" placeholder="Категория" value={form.category} onChange={handleChange} />
                    <input name="amount" placeholder="Количество" value={form.amount} onChange={handleChange} />
                    <input name="PICTURE_URL" placeholder="URL картинки" value={form.PICTURE_URL} onChange={handleChange} />
                    <textarea name="description" placeholder="Описание" value={form.description} onChange={handleChange} />

                    <div className="modal_actions">
                        <button type="submit">
                            {editingProduct ? "Сохранить" : "Создать"}
                        </button>
                        <button type="button" onClick={onClose}>
                            Отмена
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ProductModal;