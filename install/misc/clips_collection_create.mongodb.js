use strashbotkarting_db

db.createCollection("clips")
db.createCollection("counters")

db.counters.insert({
    _id: 'clips',
    seq_number: 0
})