package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
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

// SelectOutputFolder opens a native directory picker and returns the selected path.
func (a *App) SelectOutputFolder() (string, error) {
	folder, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select output folder for generated documents",
	})
	if err != nil {
		return "", err
	}

	return folder, nil
}

// WriteGeneratedFile writes markdown content into a file under the selected output folder.
func (a *App) WriteGeneratedFile(outputFolder string, relativePath string, content string) (string, error) {
	baseDir := filepath.Clean(strings.TrimSpace(outputFolder))
	if baseDir == "" {
		return "", fmt.Errorf("output folder is required")
	}

	cleanRelative := filepath.Clean(strings.TrimSpace(relativePath))
	if cleanRelative == "" || cleanRelative == "." {
		return "", fmt.Errorf("relative path is required")
	}
	if filepath.IsAbs(cleanRelative) || strings.HasPrefix(cleanRelative, "..") {
		return "", fmt.Errorf("relative path must stay within the selected folder")
	}

	fullPath := filepath.Clean(filepath.Join(baseDir, cleanRelative))
	if fullPath != baseDir && !strings.HasPrefix(fullPath, baseDir+string(os.PathSeparator)) {
		return "", fmt.Errorf("target file is outside the selected folder")
	}

	if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
		return "", err
	}

	if err := os.WriteFile(fullPath, []byte(content), 0644); err != nil {
		return "", err
	}

	return fullPath, nil
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}
