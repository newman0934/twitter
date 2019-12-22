const db = require('../models')
const User = db.User
const Order = db.Order
const Favorite = db.Favorite
const OrderItem = db.OrderItem
const Product = db.Product
const CartItem = db.CartItem
const Cart = db.Cart
const Coupon = db.Coupon
const Image = db.Image
const ProductStatus = db.ProductStatus
const Color = db.Color
const Size = db.Size

const userService = {
  getUserOrders: async (req, res, callback) => {
    const userOrderResult = await User.findByPk(req.params.id, {
      include: { model: Order, include: { model: Product, as: 'items' } }
    })

    const orders = userOrderResult.dataValues.Orders.map(d => ({
      id: d.dataValues.id,
      total_price: d.dataValues.total_price,
      shipping_status: d.dataValues.shipping_status,
      payment_status: d.dataValues.payment_status,
      UserId: d.dataValues.UserId,
      payment_method: d.dataValues.payment_method,
      comment: d.dataValues.comment,
      sn: d.dataValues.sn,
      createdAt: d.dataValues.createdAt,
      updatedAt: d.dataValues.updatedAt,
      OrderItems: d.dataValues.items.map(d => ({
        id: d.dataValues.OrderItem.id,
        sell_price: d.dataValues.OrderItem.sell_price,
        quantity: d.dataValues.OrderItem.quantity,
        createdAt: d.dataValues.OrderItem.createdAt,
        updatedAt: d.dataValues.OrderItem.updatedAt
      }))
    }))

    return callback({ orders })
  },

  getUserOrder: async (req, res, callback) => {
    const orders = await Order.findByPk(req.params.order_id, {
      include: [Coupon, { model: Product, as: 'items', include: Image }]
    })

    return callback({ orders })
  },

  getUserWishlist: async (req, res, callback) => {
    const userFavoriteResult = await User.findByPk(req.params.id, {
      include: {
        model: Product,
        as: 'FavoritedProducts',
        where: {
          status: 'on'
        },
        include: [Image, { model: ProductStatus, include: [Color, Size] }]
      }
    })

    const products = userFavoriteResult.dataValues.FavoritedProducts.map(d => ({
      id: d.dataValues.id,
      name: d.dataValues.name,
      description: d.dataValues.description,
      status: d.dataValues.status,
      categoryId: d.dataValues.CategoryId,
      image: d.dataValues.Images || [],
      color: d.dataValues.ProductStatuses.map(d => {
        return d.Color.color
      }),
      size: d.dataValues.ProductStatuses.map(d => {
        return d.Size.size
      }),
      origin_price: d.dataValues.origin_price,
      sell_price: d.dataValues.sell_price,
      isFavorited: req.user.FavoritedProducts.map(d => d.id).includes(
        d.dataValues.id
      )
    }))

    return callback({ products })
  },

  getUserCart: async (req, res, callback) => {
    const userCartResult = await User.findByPk(req.params.id, {
      include: {
        model: CartItem,
        include: [
          {
            model: Product,
            where: {
              status: 'on'
            },
            include: Image
          },
          Cart
        ]
      }
    })

    const userCart = {
      id: userCartResult.id,
      email: userCartResult.email,
      name: userCartResult.name,
      role: userCartResult.role,
      phone: userCartResult.phone,
      address: userCartResult.address,
      cartItem: userCartResult.CartItems.map(data => ({
        id: data.id,
        stock: data.stock,
        quantity: data.quantity,
        name: data.Product.name,
        description: data.Product.description,
        status: data.Product.status,
        color: data.color,
        size: data.size,
        images: data.Product.Images,
        origin_price: data.Product.origin_price,
        sell_price: data.Product.sell_price,
        CategoryId: data.Product.CategoryId,
        ProductId: data.ProductId,
        CartId: data.CartId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      })),
      cartId: null || userCartResult.CartItems[0].CartId
    }

    return callback({ userCart })
  },

  postOrder: async (req, res, callback) => {
    // TODO: 新增一筆自己的訂單
  },

  getPasswordChange: async (req, res, callback) => {
    const user = await User.findByPk(req.params.id)
    if (user.id !== req.user.id) {
      return callback({
        status: 'error',
        message: 'permission denied, user id does not match!!',
        currentUserId: req.user.id
      })
    }
    return callback({ user })
  },

  postPasswordChange: async (req, res, callback) => {
    const user = await User.findByPk(req.params.id)
    if (user.id !== req.user.id) {
      return callback({
        status: 'error',
        message: 'permission denied, user id does not match!!',
        currentUserId: req.user.id
      })
    }
    // TODO: 實作更改密碼

    return callback({
      status: 'success',
      message: 'password successfully changed'
    })
  },

  getUserEdit: async (req, res, callback) => {
    const userResult = await User.findByPk(req.params.id)
    if (userResult.id !== req.user.id) {
      return callback({
        status: 'error',
        message: 'permission denied, user id does not match!!',
        currentUserId: req.user.id
      })
    }
    const user = {
      id: userResult.dataValues.id,
      email: userResult.dataValues.email,
      password: userResult.dataValues.password,
      name: userResult.dataValues.name,
      role: userResult.dataValues.role,
      phone: userResult.dataValues.phone,
      address: userResult.dataValues.address
    }

    return callback({ user })
  }
}

module.exports = userService
