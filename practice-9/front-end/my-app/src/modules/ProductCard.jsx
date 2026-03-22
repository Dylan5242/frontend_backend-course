function ProductCard({ product, onDelete, onEdit }) {
    return (
        <div className="card">

            {/* Заголовок */}
            <h2 className="card__title">{product.title}</h2>

            {/* Средняя часть */}
            <div className="card__content">

                <img
                    className="card__image"
                    src={product.PICTURE_URL}
                    alt={product.title}
                />

                <div className="card__description">
                    <p>{product.description}</p>
                </div>

                <div className="card__actions">
                    <button onClick={() => onEdit(product)}>
                        Изменить
                    </button>
                    <button onClick={() => onDelete(product.id)}>
                        Удалить
                    </button>
                </div>

            </div>

            {/* Низ карточки */}
            <div className="card__footer">
                <span>Цена: {product.cost} ₽</span>
                <span>Количество: {product.amount}</span>
            </div>

        </div>
    );
}

export default ProductCard;