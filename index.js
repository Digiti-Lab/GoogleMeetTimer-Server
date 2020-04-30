const io = require('socket.io')(3000);

var db = {}
io.on('connection', (socket) => {    
    socket.on('sync_time', ({id, endTime}) => {
        if (id && endTime) {
            db[id] = endTime
            socket.to(id).emit('update_time', endTime)
        } else {
            socket.emit('client_error', new Error('Missing id or endTime parameter'));
        }
    })
  
    socket.on('new_meet', ({id}) => {
        if (id) {
            socket.join(id)
            if (db[id]) {
                socket.emit('update_time', db[id])
            }
        } else {
            socket.emit('client_error', new Error('Missing id parameter'));
        }      
    });

    socket.on('disconnecting', () => {
        let room = Object.keys(socket.rooms)[1]
        io.in(room).clients((err , clients) => {
            if (!err) {
                if (clients.length === 1) {
                    delete db[room]
                }
            }
        });
    })
  });