'use strict';
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

class Queries {
    constructor(models) {
        this._models = models;
    }

    // Далее идут методы, которые вам необходимо реализовать:

    getAllSouvenirs() {
        // Данный метод должен возвращать все сувениры.

        return this._models.Souvenir.findAll();
    }

    getCheapSouvenirs(price) {
        // Данный метод должен возвращать все сувениры, цена которых меньше или равна price.

        return this._models.Souvenir.findAll({
            where: {
                price: {
                    [Op.lte]: price
                }
            }
        });
    }

    getTopRatingSouvenirs(n) {
        // Данный метод должен возвращать топ n сувениров с самым большим рейтингом.

        return this._models.Souvenir.findAll({
            order: [['rating', 'DESC']],
            limit: n
        });
    }

    getSouvenirsByTag(tag) {
        // Данный метод должен возвращать все сувениры, в тегах которых есть tag.
        // Кроме того, в ответе должны быть только поля id, name, image, price и rating.
        return this._models.Souvenir.findAll(
            {
                attributes: ['id', 'name', 'image', 'price', 'rating'],
                include: [
                    {
                        model: this._models.Tag,
                        where: {
                            name: tag
                        },
                        attributes: []
                    }
                ]
            }
        );
    }

    getSouvenirsCount({ country, rating, price }) {
        // Данный метод должен возвращать количество сувениров,
        // из страны country, с рейтингом больше или равной rating,
        // и ценой меньше или равной price.

        // Важно, чтобы метод работал очень быстро,
        // поэтому учтите это при определении моделей (!).
        return this._models.Souvenir.count(
            {
                include: [
                    {
                        model: this._models.Country,
                        where: {
                            name: country
                        }
                    }
                ],
                where: {
                    rating: {
                        [Op.gte]: rating
                    },
                    price: {
                        [Op.lte]: price
                    }
                }
            }
        );
    }

    searchSouvenirs(substring) {
        // Данный метод должен возвращать все сувениры, в название которых входит
        // подстрока substring. Поиск должен быть регистронезависимым.
        return this._models.Souvenir.findAll({
            where: {
                name: {
                    [Op.iLike]: `%${substring}%`
                }
            }
        });
    }

    getDisscusedSouvenirs(n) {
        // Данный метод должен возвращать все сувениры, имеющих >= n отзывов.
        // Кроме того, в ответе должны быть только поля id, name, image, price и rating.
        return this._models.Souvenir.findAll({
            attributes: ['name', 'image', 'price', 'rating'],
            include: {
                model: this._models.Review,
                attributes: []
            },
            order: ['id'],
            group: 'souvenir.id',
            having: Sequelize.where(Sequelize.fn('COUNT', 'reviews.id'), '>=', n)
        });
    }

    deleteOutOfStockSouvenirs() {
        // Данный метод должен удалять все сувениры, которых нет в наличии
        // (то есть amount = 0).

        // Метод должен возвращать количество удаленных сувениров в случае успешного удаления.

        return this._models.Souvenir.destroy({
            where: {
                amount: 0
            }
        });
    }

    addReview(souvenirId, { login, text, rating }) {
        // Данный метод должен добавлять отзыв к сувениру souvenirId
        // содержит login, text, rating - из аргументов.
        // Обратите внимание, что при добавлении отзыва рейтинг сувенира должен быть пересчитан,
        // и всё это должно происходить за одну транзакцию (!).
        const modelUser = this._models.User;
        const modelSouvenir = this._models.Souvenir;

        return this._models.sequelize.transaction(async transaction => {
            const [user, souvenir] = await Promise.all([
                modelUser.findOne({ where: { login } }),
                modelSouvenir.findById(souvenirId)
            ]);
            await souvenir.createReview({ userId: user.id, text, rating }, { transaction });
            const reviews = await souvenir.getReviews({ transaction });
            rating = (souvenir.rating * (reviews.length - 1) + rating) / (reviews.length);

            return souvenir.update({ rating }, { transaction });
        });
    }

    getCartSum(login) {
        // Данный метод должен считать общую стоимость корзины пользователя login
        // У пользователя может быть только одна корзина, поэтому это тоже можно отразить
        // в модели.
        return this._models.Cart.sum('souvenirs.price', {
            includeIgnoreAttributes: false,
            include: [{
                model: this._models.Souvenir
            }, {
                model: this._models.User,
                where: { login }
            }]
        });
    }
}

module.exports = Queries;
