import { useState } from "react";
/**
 * 
 * TODO: want tests / rate limiting / cleaner code w/ err handling first
 */
const Settings = () => {

    const userId = localStorage.getItem("user_id");
    const [loading, setLoading] = useState(false)

    const handleClick = async () => {
        setLoading(true)
        const response = await fetch(`https://us-central1-stroller-stats.cloudfunctions.net/app/sync-historical-data/${userId}`, {method: "POST", headers: {
            "Content-Type": "application/json",
          }, body: JSON.stringify({user_id: userId})})
        const data = await response.json();
        console.log(data)
        setLoading(false);
    }

    return (
        <div>
            <h1>Settings</h1>
            <button disabled={!!loading }onClick={handleClick}>{loading? "Work in progress..." : "Sync data from previously this year."}</button>
        </div>
    )
}
export default Settings;