const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server); 
const iopm2 = require('@pm2/io');

server.listen(3000); // Set socket.io to listen on port 3000

var currentUsers = 0 // For statistical uses we take trace of the number of users
const realtimeUsers = iopm2.metric({ // pm2 module to pass the variable to pm2 monit
    name: 'Realtime Users',
    id: 'app/realtime/users'
})

const maxRealtimeUsers = iopm2.metric({ // pm2 module to pass the variable to pm2 monit
    name: 'Record Users number',
    id: 'app/realtime/maxusers'
})

setInterval(() => { // Update the realtimeUser variable every 5 secs
    realtimeUsers.set(currentUsers)
    if (maxRealtimeUsers < currentUsers) {maxRealtimeUsers.set(currentUsers)}
    }, 5000)

app.get('/', (req, res) => {
    res.send('timer api online')
});

var db = {} // Declare the object that we will use as db

io.on('connection', (socket) => {
    currentUsers += 1
    socket.on('sync_time', ({id, endTime, senderName, userImage, seconds}) => {
        if (id && endTime) {             
            db[id] = {endTime, seconds} // Store endTime and seconds in the db
            socket.to(id).emit('update_time', {endTime, senderName, userImage, seconds}) // Update the time on every client in the room but the sender
        } else {
            socket.emit('client_error', new Error('Missing id or endTime parameter')); // Send error to the sender
        }
    })
  
    socket.on('new_meet', ({id, endTime, seconds}) => {
        if (id) {
            socket.join(id) // Join or create the room with that id
            if (db[id]) {
                socket.emit('update_time', {endTime: db[id].endTime, seconds: db[id].seconds}) // If the timer has already started, send the time to the new client
            } else if (endTime) {
                db[id] = {endTime, seconds} // Store endTime and seconds in the db
            }
        } else {
            socket.emit('client_error', new Error('Missing id parameter')); // Send error to the sender
        }      
    });

    socket.on('disconnecting', () => {
        currentUsers -= 1
        let room = Object.keys(socket.rooms)[1] // Get the second room in which the client is (The first one corresponds to the client itself)
        io.in(room).clients((err , clients) => { // Get all the clients in that room
            if (!err) {
                if (clients.length === 1) { // If the room is empty (only the leaving client is in it)
                    delete db[room]  // Delete the db key
                }
            }
        });
    })
  });
