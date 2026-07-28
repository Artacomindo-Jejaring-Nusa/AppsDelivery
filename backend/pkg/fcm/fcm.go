package fcm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type ServiceAccount struct {
	Type         string `json:"type"`
	ProjectID    string `json:"project_id"`
	PrivateKeyID string `json:"private_key_id"`
	PrivateKey   string `json:"private_key"`
	ClientEmail  string `json:"client_email"`
	TokenURI     string `json:"token_uri"`
}

type FCMService struct {
	sa           *ServiceAccount
	accessToken  string
	tokenExpires time.Time
	mu           sync.Mutex
}

var defaultService *FCMService

func Init(credentialsPath string) error {
	data, err := os.ReadFile(credentialsPath)
	if err != nil {
		return fmt.Errorf("failed to read service account file: %w", err)
	}

	var sa ServiceAccount
	if err := json.Unmarshal(data, &sa); err != nil {
		return fmt.Errorf("failed to parse service account file: %w", err)
	}

	defaultService = &FCMService{
		sa: &sa,
	}
	return nil
}

func (s *FCMService) getAccessToken() (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.accessToken != "" && time.Now().Before(s.tokenExpires.Add(-2*time.Minute)) {
		return s.accessToken, nil
	}

	now := time.Now()
	claims := jwt.MapClaims{
		"iss":   s.sa.ClientEmail,
		"scope": "https://www.googleapis.com/auth/firebase.messaging",
		"aud":   s.sa.TokenURI,
		"exp":   now.Add(1 * time.Hour).Unix(),
		"iat":   now.Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	key, err := jwt.ParseRSAPrivateKeyFromPEM([]byte(s.sa.PrivateKey))
	if err != nil {
		return "", fmt.Errorf("failed to parse RSA private key: %w", err)
	}

	signedJWT, err := token.SignedString(key)
	if err != nil {
		return "", fmt.Errorf("failed to sign JWT: %w", err)
	}

	// Exchange signed JWT for OAuth2 Access Token
	resp, err := http.PostForm(s.sa.TokenURI, map[string][]string{
		"grant_type": {"urn:ietf:params:oauth:grant-type:jwt-bearer"},
		"assertion":  {signedJWT},
	})
	if err != nil {
		return "", fmt.Errorf("failed to send oauth token request: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("oauth token error (%d): %s", resp.StatusCode, string(body))
	}

	var oauthResp struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.Unmarshal(body, &oauthResp); err != nil {
		return "", fmt.Errorf("failed to parse oauth response: %w", err)
	}

	s.accessToken = oauthResp.AccessToken
	s.tokenExpires = time.Now().Add(time.Duration(oauthResp.ExpiresIn) * time.Second)

	return s.accessToken, nil
}

// SendPushNotification sends a push message to target FCM Token
func SendPushNotification(ctx context.Context, fcmToken, title, bodyMessage string) error {
	if defaultService == nil {
		return fmt.Errorf("FCM service not initialized")
	}

	accessToken, err := defaultService.getAccessToken()
	if err != nil {
		return fmt.Errorf("FCM access token error: %w", err)
	}

	url := fmt.Sprintf("https://fcm.googleapis.com/v1/projects/%s/messages:send", defaultService.sa.ProjectID)

	payload := map[string]interface{}{
		"message": map[string]interface{}{
			"token": fcmToken,
			"notification": map[string]string{
				"title": title,
				"body":  bodyMessage,
			},
			"android": map[string]interface{}{
				"priority": "HIGH",
				"notification": map[string]string{
					"sound": "default",
				},
			},
		},
	}

	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send FCM request: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("FCM send failed (%d): %s", resp.StatusCode, string(respBody))
	}

	return nil
}
