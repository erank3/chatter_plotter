import { useState, useEffect } from "react";
import ShoppingCenterList from "./components/ShoppingCenterList";
import { Typography, Box, TextField, Button } from "@mui/material";
import axios from "axios";
import { List, ListItem, ListItemText } from "@mui/material";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import CodeBlock from "./components/CodeBlock";
import Grid from "@mui/material/Unstable_Grid2";
import CircularProgress from "@mui/material/CircularProgress";

const serverAddress = "http://35.192.118.40";

function App() {
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendingChatMessage, setSendingChatMessage] = useState(false);

  const [userPrompt, setUserPrompt] = useState("");
  const [plotterResposne, setPlotterResposne] = useState("");

  const [message, setMessage] = useState("");
  const [centers, setCenters] = useState([]);

  const [centerData, setCenterData] = useState(null);

  const [selectedTab, setSelectedTab] = useState(0);

  useEffect(() => {
    // Disable scrolling
    document.body.style.overflow = "hidden";
  }, []);

  const handleSendAdminMessage = async () => {
    setSendingMessage(true); // Start loading

    //Champions Center
    setCenters([]);
    try {
      let endpoint = "get-shopping-center-names";
      if (message) {
        endpoint = "get-center-data";
      }

      const response = await axios.get(`${serverAddress}/${endpoint}`, {
        params: {
          center: message,
        },
      });
      setCenters(response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setSendingMessage(false); // End loading
      setMessage("");
    }
  };

  const handleChatMessage = async () => {
    setSendingChatMessage(true); // Start loading

    try {
      let endpoint = "plot";
      if (!userPrompt) {
        return;
      }

      const response = await axios.get(`${serverAddress}/${endpoint}`, {
        params: {
          prompt: userPrompt,
        },
      });

      setPlotterResposne(response.data);
    } catch (error) {
      setMessage(JSON.stringify(error));
      console.error("Error fetching data:", error);
    } finally {
      setSendingChatMessage(false); // End loading
      setMessage("");
    }

    setMessage("");
  };

  const centerDidClick = async (center) => {
    console.log(center);

    const response = await axios.get(
      `${serverAddress}/foot-traffic-trend/${center.id}`,
      {}
    );
    setCenterData(JSON.stringify(response.data));
  };

  const handleTabChange = (event, newValue) => {
    if (selectedTab === newValue) {
      return;
    }
    if (newValue === 0) {
      //fetchData();
    } else if (newValue === 1) {
      //fetchData(null, true);
    }

    setSelectedTab(newValue);
  };

  return (
    <Grid
      container
      alignItems="center"
      justifyContent="center"
      xs={12}
      className="App"
      sx={{
        height: "100%",
        width: "100%",
      }}
    >
      <Grid xs={12}>
        <header className="App-header">
          <h2>Chatter Plotter</h2>
        </header>
      </Grid>
      <Grid>
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          variant="fullWidth"
        >
          <Tab label="Plotter" />
          <Tab label="Admin" />
        </Tabs>
        {selectedTab === 1 && (
          <Box>
            <header className="App-header">
              <h2>Shopping Centers</h2>
            </header>

            <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
              <TextField
                label="Type your center name"
                variant="outlined"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                sx={{ mr: 1 }}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleSendAdminMessage}
                disabled={sendingMessage} // Disable button when sending
              >
                {sendingMessage ? <CircularProgress size={24} /> : "Send"}
              </Button>
            </Box>

            <Box>
              <List sx={{ overflowY: "auto", height: "300px" }}>
                {centers.map((center, index) => (
                  <ListItem
                    onClick={() => {
                      centerDidClick(center);
                    }}
                    key={index}
                  >
                    <ListItemText
                      primary={center.name}
                      secondary={`${center.city}, ${center.state}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
            <Grid>
              <CodeBlock code={centerData || ""} />
            </Grid>
          </Box>
        )}
        {selectedTab === 0 && (
          <Box>
            <header className="App-header">
              <h2>Assistant</h2>
            </header>
            <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
              <TextField
                label="Ask me something"
                variant="outlined"
                fullWidth
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                sx={{ mr: 1 }}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleChatMessage}
                disabled={sendingChatMessage} // Disable button when sending
              >
                {sendingChatMessage ? <CircularProgress size={24} /> : "Send"}
              </Button>
            </Box>

            <Box>
              <CodeBlock code={plotterResposne?.summary || ""} />
            </Box>
          </Box>
        )}

        <div>
          <Box
            sx={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: "background.paper",
              p: 6,
              textAlign: "center",
            }}
          >
            <a
              href="https://www.linkedin.com/in/kaufmane/"
              target="_blank"
              rel="noreferrer"
            >
              <Typography
                variant="subtitle1"
                color="textSecondary"
                component="p"
              >
                Made by Eran Kaufman
              </Typography>
            </a>
          </Box>
        </div>
      </Grid>
    </Grid>
  );
}

export default App;
