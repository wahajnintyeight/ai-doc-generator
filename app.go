package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
)

// App struct
type App struct {
	ctx        context.Context
	configPath string
}

// Config represents user preferences stored in <APP-NAME>/config.json
type Config struct {
	Theme    string `json:"theme"`
	Provider string `json:"provider"`
	ApiKey   string `json:"apiKey"`
	Model    string `json:"model"`
	LastUsed string `json:"lastUsed"`
}

// NewApp creates a new App application struct
func NewApp() *App {
	// Initialize config path in USERDATA/doc-gen-ai/config.json
	home, err := os.UserConfigDir()
	if err != nil {
		home, _ = os.UserHomeDir()
	}
	configDir := filepath.Join(home, "doc-gen-ai")
	return &App{
		configPath: filepath.Join(configDir, "config.json"),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	// Ensure config directory exists
	os.MkdirAll(filepath.Dir(a.configPath), 0755)
}

// LoadConfig reads the config.json file from the USERDATA folder.
func (a *App) LoadConfig() string {
	data, err := os.ReadFile(a.configPath)
	if err != nil {
		return ""
	}
	return string(data)
}

// SaveConfig writes the config.json file to the USERDATA folder.
func (a *App) SaveConfig(configJSON string) error {
	// Ensure directory exists if it was deleted
	os.MkdirAll(filepath.Dir(a.configPath), 0755)
	return os.WriteFile(a.configPath, []byte(configJSON), 0644)
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}
