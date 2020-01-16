process.env.NODE_ENV = 'test'

const chai = require('chai')
let request = require('supertest')
const sinon = require('sinon')
const should = chai.should()
const expect = chai.expect
const bcrypt = require('bcryptjs')

const app = require('../../app')
const helpers = require('../../_helpers')
const db = require('../../models')

let APItoken = ''

describe('# Order request', () => {
  before(async () => {
    await db.User.create({
      name: 'Test1',
      email: 'test1@example.com',
      password: bcrypt.hashSync('12345678', bcrypt.genSaltSync(10), null),
      role: 'admin'
    })
    await db.Order.create({
      UserId: 1
    })
    await db.Product.bulkCreate([
      {
        name: 'product1',
        description: 'product1 des'
      },
      {
        name: 'product2',
        description: 'product2 des'
      }
    ])
    await db.Image.bulkCreate([
      {
        url: '',
        ProductId: 1
      },
      {
        url: '',
        ProductId: 2
      }
    ])
    await db.OrderItem.bulkCreate([
      {
        OrderId: 1,
        ProductId: 1
      },
      {
        OrderId: 1,
        ProductId: 2
      }
    ])
  })
  context('getUserOrders request', () => {
    it('should log in success', done => {
      request(app)
        .post('/api/signin')
        .send({ email: 'test1@example.com', password: '12345678' })
        .set('Accept', 'application/json')
        .expect(200)
        .end((err, res) => {
          APItoken = res.body.token
          expect(res.body.status).to.equal('success')
          expect(res.body.message).to.equal('ok')
          done()
        })
    })
    it('should return order does not exist!! if :id is wrong', done => {
      request(app)
        .get('/api/orders/99/checkout')
        .set('Authorization', 'bearer ' + APItoken)
        .set('Accept', 'application/json')
        .expect(200)
        .end((err, res) => {
          expect(res.body.status).to.equal('error')
          expect(res.body.message).to.equal('order does not exist!!')
          done()
        })
    })
    it('should return a json data', done => {
      request(app)
        .get('/api/orders/1/checkout')
        .set('Authorization', 'bearer ' + APItoken)
        .set('Accept', 'application/json')
        .expect(200)
        .end((err, res) => {
          expect(res.body.orderItems.length).to.equal(2)
          done()
        })
    })
  })

  context('postOrder request', () => {
    describe('when user add order from cart and failed', () => {
      before(async () => {
        await db.Coupon.create({
          coupon_code: 'coupon'
        })
        await db.CartItem.create({
          UserId: 99
        })
      })
      it('should return coupon is not existed!! if coupon is not valid', done => {
        request(app)
          .post('/api/users/orders')
          .send({ couponCode: 'abc' })
          .set('Authorization', 'bearer ' + APItoken)
          .set('Accept', 'application/json')
          .expect(200)
          .end((err, res) => {
            expect(res.body.status).to.equal('error')
            expect(res.body.message).to.equal('coupon is not existed!!')
            done()
          })
      })
      it('should return no matched cart items found', done => {
        request(app)
          .post('/api/users/orders')
          .set('Authorization', 'bearer ' + APItoken)
          .set('Accept', 'application/json')
          .expect(200)
          .end((err, res) => {
            expect(res.body.status).to.equal('error')
            expect(res.body.message).to.equal('no matched cart items found')
            done()
          })
      })
    })
    describe('when user successfully add order from cart', () => {
      before(async () => {
        await db.CartItem.create({ UserId: 1, ProductId: 1 })
      })
      it('should successfully create an order', done => {
        request(app)
          .post('/api/users/orders')
          .set('Authorization', 'bearer ' + APItoken)
          .set('Accept', 'application/json')
          .expect(200)
          .end((err, res) => {
            expect(res.body.status).to.equal('success')
            expect(res.body.message).to.equal('Order successfully created')
            done()
          })
      })
    })
  })

  context('postCheckout request', () => {
    describe('when user click order confirm', () => {
      before(async () => {
        await db.Order.destroy({ where: {}, truncate: true })
        await db.Order.bulkCreate([
          {
            UserId: 99,
            ProductId: 1
          },
          {
            UserId: 1,
            ProductId: 1
          }
        ])
        await db.OrderItem.create({
          ProductId: 1,
          quantity: 1,
          sell_price: 100,
          OrderId: 2
        })
      })
      it('should return error if orderId is not correct', done => {
        request(app)
          .post('/api/orders/checkout')
          .send({ orderId: 1 })
          .set('Authorization', 'bearer ' + APItoken)
          .set('Accept', 'application/json')
          .expect(200)
          .end((err, res) => {
            expect(res.body.status).to.equal('error')
            expect(res.body.message).to.equal(
              'current user does not match with order!!'
            )
            done()
          })
      })
      it('should return error if total is not correct', done => {
        request(app)
          .post('/api/orders/checkout')
          .send({ orderId: 2, total: 900 })
          .set('Authorization', 'bearer ' + APItoken)
          .set('Accept', 'application/json')
          .expect(200)
          .end((err, res) => {
            expect(res.body.status).to.equal('error')
            expect(res.body.message).to.equal('total is not correct!!4')
            done()
          })
      })
      it('should return error if missing any column', done => {
        request(app)
          .post('/api/orders/checkout')
          .send({ orderId: 2, total: 100, deliver: 0 })
          .set('Authorization', 'bearer ' + APItoken)
          .set('Accept', 'application/json')
          .expect(200)
          .end((err, res) => {
            expect(res.body.status).to.equal('error')
            expect(res.body.message).to.equal('every column must be input')
            done()
          })
      })
      it('should return success if every column is valid', done => {
        request(app)
          .post('/api/orders/checkout')
          .send({
            orderId: 2,
            total: 100,
            receiverName: 'a',
            receiverPhone: '123',
            receiverAddress: 'aa'
          })
          .set('Authorization', 'bearer ' + APItoken)
          .set('Accept', 'application/json')
          .expect(200)
          .end((err, res) => {
            expect(res.body.status).to.equal('success')
            expect(res.body.message).to.equal('postCheckout successful')
            done()
          })
      })
      after(async () => {
        await db.Order.destroy({ where: {}, truncate: true })
        await db.OrderItem.destroy({ where: {}, truncate: true })
      })
    })
  })

  context('getPayment request', () => {
    describe('when user is ready to be redirect to spgateway page', () => {
      before(async () => {
        await db.Order.create({
          total_price: 1000,
          shipping_method: 0
        })
      })
      it('should return a json data', done => {
        request(app)
          .get('/api/orders/1/payment')
          .set('Authorization', 'bearer ' + APItoken)
          .set('Accept', 'application/json')
          .expect(200)
          .end((err, res) => {
            console.log(res.body)
            expect(res.body.tradeInfo.MerchantId).not.equal(null)
            expect(res.body.total).to.equal(1000)
            expect(res.body.orderId).to.equal('1')
            expect(res.body.email).to.equal('test1@example.com')
            done()
          })
      })
      after(async () => {
        await db.Order.destroy({ where: {}, truncate: true })
      })
    })
  })

  context('getPaymentComplete request', () => {
    describe('when user complete his payment and being redirect back to this route', () => {
      before(async () => {
        await db.Order.create({
          payment_status: 1
        })
      })

      it('should return route is invalid', done => {
        request(app)
          .get('/api/users/paymentcomplete')
          .set('Authorization', 'bearer ' + APItoken)
          .set('Accept', 'application/json')
          .expect(200)
          .end((err, res) => {
            expect(res.body.status).to.equal('error')
            expect(res.body.message).to.equal('route is invalid!!')
            done()
          })
      })

      it('should return payment failed', done => {
        request(app)
          .get('/api/users/paymentcomplete?Status=FAILED&orderId=99')
          .set('Authorization', 'bearer ' + APItoken)
          .set('Accept', 'application/json')
          .expect(200)
          .end((err, res) => {
            expect(res.body.status).to.equal('error')
            expect(res.body.message).to.equal('payment failed!!')
            done()
          })
      })

      it('should return a json data', done => {
        request(app)
          .get('/api/users/paymentcomplete?Status=SUCCESS&orderId=1')
          .set('Authorization', 'bearer ' + APItoken)
          .set('Accept', 'application/json')
          .expect(200)
          .end((err, res) => {
            expect(res.body.orderItems).not.equal(null)
            expect(res.body.buyer.email).to.equal('test1@example.com')
            done()
          })
      })

      after(async () => {
        await db.Order.destroy({ where: {}, truncate: true })
      })
    })
  })

  after(async () => {
    await db.User.destroy({ where: {}, truncate: true })
    await db.Product.destroy({ where: {}, truncate: true })
    await db.Order.destroy({ where: {}, truncate: true })
    await db.Image.destroy({ where: {}, truncate: true })
    await db.OrderItem.destroy({ where: {}, truncate: true })
    await db.Coupon.destroy({ where: {}, truncate: true })
    await db.CartItem.destroy({ where: {}, truncate: true })
  })
})
