const io = require('socket.io')(3000); // Set socket.io to listen on port 3000

var db = {} // Declare the object that we will use as db

io.on('connection', (socket) => {    
    socket.on('sync_time', ({id, endTime}) => {
        if (id && endTime) { 
            db[id] = endTime // Store the endTime in the db
            socket.to(id).emit('update_time', endTime) // Update the time on every client in the room but the sender
        } else {
            socket.emit('client_error', new Error('Missing id or endTime parameter')); // Send error to the sender
        }
    })
  
    socket.on('new_meet', ({id}) => {
        if (id) {
            socket.join(id) // Join or create the room with that id
            if (db[id]) {
                socket.emit('update_time', db[id]) // If the timer has already started, send the time to the new client
            }
        } else {
            socket.emit('client_error', new Error('Missing id parameter')); // Send error to the sender
        }      
    });

    socket.on('disconnecting', () => {
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