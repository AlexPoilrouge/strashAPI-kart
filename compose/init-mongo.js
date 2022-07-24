
let res = [
  db.clips.drop(),
  db.clips.createIndex({ id: -1 }, { unique: true }),
  db.clips.createIndex({ type: 1 }),
  db.clips.createIndex({ timestamp: 1 }),
  db.clips.createIndex({ submitter_id: 1 }),
  db.clips.insert({
        id: 181, type:'video',
        url: "https://cdn.discordapp.com/attachments/713699603777716267/987848222829600788/SPBstop.webm",
        timestamp: new Date('2022-06-18 22:36:10'),
        description: "",
        submitter_id: "185096597799960577"
    }),
  db.clips.insert({
        id: 173, type:'youtube',
        url: "https://www.youtube.com/watch?v=sxn1HtIpPVk",
        timestamp: new Date('2022-06-18 22:36:10'),
        description: "funny clips",
        submitter_id: "185096597799960577"
      })
]

printjson(res)