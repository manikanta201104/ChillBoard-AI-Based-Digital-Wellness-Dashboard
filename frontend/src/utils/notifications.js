export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications.");
    return;
  }

  if (Notification.permission !== "granted" && Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log("Notification permission granted.");
    } else {
      console.warn("Notification permission denied.");
    }
  }
};

export const scheduleNotifications = (frequency) => {
  // Clear any existing intervals to prevent duplicates
  const existingInterval = window.notificationInterval;
  if (existingInterval) {
    clearInterval(existingInterval);
    window.notificationInterval = null;
  }

  if (frequency === "Off") return;

  const intervalTime = frequency === "Every 2 hours" ? 2 * 60 * 60 * 1000 : 4 * 60 * 60 * 1000;

  const showNotification = () => {
    if (Notification.permission === "granted") {
      new Notification("Mood-Based Music App", {
        body: "Time to check your mood and get new music recommendations!",
        icon: "/path/to/icon.png", // Replace with your app's icon path
      });
    }
  };

  // Schedule notifications
  window.notificationInterval = setInterval(showNotification, intervalTime);

  // Trigger first notification immediately for testing
  showNotification();
};