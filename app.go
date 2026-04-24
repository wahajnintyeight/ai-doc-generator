package main

import (
	"context"
	"encoding/json"
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

type generatedFileEntry struct {
	Name  string `json:"name"`
	Path  string `json:"path"`
	IsDir bool   `json:"isDir"`
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

func (a *App) sessionPath() string {
	return filepath.Join(filepath.Dir(a.configPath), "session.json")
}

func resolveSandboxPath(baseDir string, relativePath string) (string, error) {
	cleanBase := filepath.Clean(strings.TrimSpace(baseDir))
	if cleanBase == "" {
		return "", fmt.Errorf("base folder is required")
	}

	cleanRelative := filepath.Clean(strings.TrimSpace(relativePath))
	if cleanRelative == "" || cleanRelative == "." {
		return "", fmt.Errorf("relative path is required")
	}
	if filepath.IsAbs(cleanRelative) || strings.HasPrefix(cleanRelative, "..") {
		return "", fmt.Errorf("relative path must stay within the selected folder")
	}

	fullPath := filepath.Clean(filepath.Join(cleanBase, cleanRelative))
	if fullPath != cleanBase && !strings.HasPrefix(fullPath, cleanBase+string(os.PathSeparator)) {
		return "", fmt.Errorf("target path is outside the selected folder")
	}

	return fullPath, nil
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
	fullPath, err := resolveSandboxPath(outputFolder, relativePath)
	if err != nil {
		return "", err
	}

	if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
		return "", err
	}

	if err := os.WriteFile(fullPath, []byte(content), 0644); err != nil {
		return "", err
	}

	return fullPath, nil
}

// ReadGeneratedFile reads a file from the selected output folder.
func (a *App) ReadGeneratedFile(outputFolder string, relativePath string) (string, error) {
	fullPath, err := resolveSandboxPath(outputFolder, relativePath)
	if err != nil {
		return "", err
	}

	data, err := os.ReadFile(fullPath)
	if err != nil {
		return "", err
	}

	return string(data), nil
}

// ListGeneratedFiles lists files in a directory under the selected output folder.
func (a *App) ListGeneratedFiles(outputFolder string, relativePath string) (string, error) {
	cleanRelative := strings.TrimSpace(relativePath)
	cleanBase := filepath.Clean(strings.TrimSpace(outputFolder))
	if cleanBase == "" {
		return "", fmt.Errorf("base folder is required")
	}

	fullPath := cleanBase
	if cleanRelative != "" && cleanRelative != "." {
		resolvedPath, err := resolveSandboxPath(outputFolder, relativePath)
		if err != nil {
			return "", err
		}
		fullPath = resolvedPath
	}

	entries, err := os.ReadDir(fullPath)
	if err != nil {
		if os.IsNotExist(err) {
			payload, marshalErr := json.Marshal([]generatedFileEntry{})
			if marshalErr != nil {
				return "", marshalErr
			}
			return string(payload), nil
		}
		return "", err
	}

	result := make([]generatedFileEntry, 0, len(entries))
	for _, entry := range entries {
		name := entry.Name()
		displayPath := filepath.ToSlash(filepath.Join(cleanRelative, name))
		if cleanRelative == "" || cleanRelative == "." {
			displayPath = filepath.ToSlash(name)
		}
		result = append(result, generatedFileEntry{
			Name:  name,
			Path:  displayPath,
			IsDir: entry.IsDir(),
		})
	}

	payload, err := json.Marshal(result)
	if err != nil {
		return "", err
	}

	return string(payload), nil
}

// SaveSession stores the current session JSON alongside the config file.
func (a *App) SaveSession(sessionJSON string) error {
	if strings.TrimSpace(sessionJSON) == "" {
		sessionJSON = "{}"
	}

	if err := os.MkdirAll(filepath.Dir(a.sessionPath()), 0755); err != nil {
		return err
	}

	return os.WriteFile(a.sessionPath(), []byte(sessionJSON), 0644)
}

// LoadSession reads the saved session JSON.
func (a *App) LoadSession() string {
	data, err := os.ReadFile(a.sessionPath())
	if err != nil {
		return ""
	}
	return string(data)
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}
