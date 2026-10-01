pipeline {
    agent {
        // Label disesuaikan dengan label Node/Agent yang dibuat di Jenkins
        node {
            label 'apps-delivery-agent'
        }
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    parameters {
        choice(name: 'DEPLOY_ENV', choices: ['production', 'staging'], description: 'Target environment deployment')
        booleanParam(name: 'NO_CACHE', defaultValue: false, description: 'Build Docker images without cache')
        booleanParam(name: 'PRUNE_IMAGES', defaultValue: true, description: 'Clean up unused docker images after deployment')
    }

    environment {
        COMPOSE_PROJECT_NAME = 'appsdelivery'
        BACKEND_PORT         = '8080'
        FRONTEND_PORT        = '80'
    }

    stages {
        stage('1. Environment & Pre-Flight Check') {
            steps {
                echo "=== [Pre-Flight Check] Menyiapkan environment deployment ==="
                sh '''
                    # Cek keberadaan Docker dan Docker Compose
                    docker --version
                    docker compose version

                    # Pastikan direktori backend .env sudah ada (jika belum, salin dari .env.example)
                    if [ ! -f backend/.env ]; then
                        echo "Warning: backend/.env tidak ditemukan. Menyalin dari backend/.env.example..."
                        cp backend/.env.example backend/.env
                    fi

                    # Pastikan permission firebase-service-account.json aman jika ada
                    if [ -f backend/firebase-service-account.json ]; then
                        chmod 600 backend/firebase-service-account.json || true
                    fi
                '''
            }
        }

        stage('2. Build & Deploy Containers') {
            steps {
                echo "=== [Deploy] Menjalankan Docker Compose Build & Up ==="
                script {
                    def buildArgs = params.NO_CACHE ? '--no-cache' : ''
                    sh """
                        # Build dan jalankan service di background
                        docker compose build ${buildArgs}
                        docker compose up -d --remove-orphans
                    """
                }
            }
        }

        stage('3. Health Check & Validation') {
            steps {
                echo "=== [Health Check] Memverifikasi status container & endpoint ==="
                sh '''
                    echo "Menunggu 10 detik agar container selesai inisialisasi..."
                    sleep 10

                    # Tampilkan status container
                    docker compose ps

                    # Cek apakah container utama berjalan
                    if ! docker compose ps --services --filter "status=running" | grep -q "api"; then
                        echo "ERROR: Service 'api' tidak berjalan!"
                        docker compose logs --tail=50 api
                        exit 1
                    fi

                    if ! docker compose ps --services --filter "status=running" | grep -q "web"; then
                        echo "ERROR: Service 'web' tidak berjalan!"
                        docker compose logs --tail=50 web
                        exit 1
                    fi

                    echo "Semua container (web, api, postgres, redis) berhasil berjalan normal."
                '''
            }
        }
    }

    post {
        always {
            script {
                if (params.PRUNE_IMAGES) {
                    echo "=== [Cleanup] Membersihkan dangling docker images ==="
                    sh 'docker image prune -f || true'
                }
            }
        }
        success {
            echo "✅ [SUCCESS] Deployment Apps Delivery ke server berhasil diselesaikan!"
        }
        failure {
            echo "❌ [FAILURE] Deployment Apps Delivery gagal! Periksa log di atas."
            sh 'docker compose logs --tail=100 || true'
        }
    }
}
