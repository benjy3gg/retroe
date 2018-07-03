var express = require('express')
var app = express()
var http = require('http').Server(app)
var io = require('socket.io')(http)

app.use('static', express.static('public'))

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html')
})

var usersVoted = []
var usersNum = 0
var goodCards = []
var badCards = []
var groups = []
var votes = []
var actions = []

function remove(a, element) {
  var index = a.map(function (e) { return e.text }).indexOf(element.text)

  if (index !== -1) {
    a.splice(index, 1)
  }
}

io.on('connection', function (socket) {
  console.log('a user connected')
  socket.emit('connected', usersNum)
  usersNum++
  usersVoted[usersNum] = 3

  for (card of [...goodCards, ...badCards]) {
    socket.emit('card', card)
    console.log('Sent cards to new user')
  }

  socket.emit('group', groups)

  socket.on('startGrouping', function () {
    var cards = [...goodCards, ...badCards]
    groups = []
    for (card of cards) {
      card.group = card.text
      group = { title: card.text, cards: [card], votes: 0 }
      groups.push(group)
    }
    for (i = 0; i < usersNum; i++) {
      usersVoted[i] = Math.max(groups.length - 1, 1)
    }
    socket.emit('group', groups)
    socket.broadcast.emit('group', groups)
    socket.emit('canVote', usersVoted[0])
    socket.broadcast.emit('canVote', usersVoted[0])
  })

  socket.on('moveCard', function (move) {
    const fromGroupIndex = groups.map(e => e.title).indexOf(move.from)
    const toGroupIndex = groups.map(e => e.title).indexOf(move.to)

    remove(groups[fromGroupIndex].cards, move.card)
    move.card.group = groups[toGroupIndex].title
    groups[toGroupIndex].cards.push(move.card)

    socket.emit('group', groups)
    socket.broadcast.emit('group', groups)
  })

  socket.on('vote', function (vote) {
    if (usersVoted[vote.userid] > 0) {
      usersVoted[vote.userid]--
      const groupIndex = groups.map(e => e.title).indexOf(vote.title)
      groups[groupIndex].votes++
      socket.emit('group', groups)
      socket.broadcast.emit('group', groups)
    } else {
      socket.emit('voteFailed')
    }
  })

  socket.on('send', function (card) {
    console.log('got new message from:' + card.userid + ' saying: ' + card.text + ', ' + card.type)
    if (card.type) {
      goodCards.push(card)
    } else {
      badCards.push(card)
    }
    socket.emit('card', { text: card.text, userid: card.userid, type: card.type })
    socket.broadcast.emit('card', { text: card.text, userid: card.userid, type: card.type })
  })
})

var port = process.env.PORT || 8080;
http.listen(port, function () {
  console.log('listening on *:80')
})
