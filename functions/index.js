
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_KEY,
  authDomain: "stroller-stats.firebaseapp.com",
  projectId: "stroller-stats",
  storageBucket: "stroller-stats.appspot.com",
  messagingSenderId: "958011019232",
  appId: "1:958011019232:web:70b9bc995f933a4c782585",
  measurementId: "G-L9CK7DZZQH",
};

// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
admin.initializeApp(firebaseConfig);

const db = admin.firestore();

const functions = require("firebase-functions");
const fetch = require("node-fetch");

const getRefreshToken = async (userId) => {
  return db.collection("users")
      .where("user_id", "==", userId)
      .limit(1)
      .get()
      .then((data) => {
        functions.logger.info("DATA", data.docs);
        return data.docs[0].get("refresh_token");
      });
};

// TODO update db w/ new tokens?
const getAccessToken = async (refreshToken) => {
  return fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  }).then((res) => res.json()).then((res) => res.access_token);
};
const getLastActivity = async (accessToken, activityId) => {
  functions.logger.info("in get last activity", typeof activityId);

  const response = await fetch(`https://www.strava.com/api/v3/activities/${activityId}?include_all_efforts=false`, {
    headers: {authorization: `Bearer ${accessToken}`},
  });
  const data = await response.json();
  return {
    title: data["name"],
    distance: data["distance"],
    sport_type: data["sport_type"],
    start_date: data["start_date"],
    average_speed: data["average_speed"],
    description: data["description"],
  };
};

/**
 * Webhooks - the GET method must respond to an initial request to create
 * the subscription. See: https://developers.strava.com/docs/webhooks/
 *
 * I ran creation request from the command line after deploying the GET portion
 *
 */
exports.stravaWebhook = functions.https.onRequest((request, response) => {
  functions.logger.info("got a request");
  if (request.method === "POST") {
    functions.logger.info("Received webhook event", {
      query: request.query,
      body: request.body,
    });

    const {owner_id: userId, object_id: activityId} = request.body;

    handlePost(userId, activityId).then(() => {
      response.status(200).send("Completed post handling.");
    });
  } else if (request.method === "GET") {
    const VERIFY_TOKEN = "STROLLER-STATS";
    const mode = request.query["hub.mode"];
    const token = request.query["hub.verify_token"];
    const challenge = request.query["hub.challenge"];

    if (mode && token) {
      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        functions.logger.info("WEBHOOK_VERIFIED");
        response.status(200).json({"hub.challenge": challenge});
      } else {
        response.sendStatus(403);
      }
    } else {
      response.sendStatus(403);
    }
  }
});

const handlePost = async (userId, activityId) => {
  const refreshToken = await getRefreshToken(userId);
  functions.logger.info("REFRESH TOKEN", refreshToken);
  const accessToken = await getAccessToken(refreshToken);
  const recentActivity = await getLastActivity(accessToken, activityId);
  // TODO: get latest activities and update db
  console.log(recentActivity);
};

