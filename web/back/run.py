from app import app
# from app import socketio

# The port number should be the same as the front end
#try:
# socketio.run(app, host='localhost', port=8500, use_reloader=False, debug=True)
app.run(host='localhost', port=8500, use_reloader=False, debug=True)
#except:
    #print("Something wrong!")