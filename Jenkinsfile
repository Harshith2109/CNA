pipeline {
    agent any

    environment {
        // Azure Container Registry settings
        ACR_REGISTRY = "taskflowregistry.azurecr.io"
        BACKEND_IMAGE = "taskflowregistry.azurecr.io/task-manager-backend"
        FRONTEND_IMAGE = "taskflowregistry.azurecr.io/task-manager-frontend"
        
        // Deployment settings
        AZURE_VM_USER = "azureuser"
        AZURE_VM_PRIVATE_IP = "10.8.0.1" // WireGuard VPN Gateway IP for 1-VM setup
        
        // Jenkins Credentials IDs
        ACR_CREDS_ID = "azure-acr-login"
        SSH_CREDS_ID = "azure-vm-ssh-key"
        WG_CONFIG_CREDS_ID = "wireguard-wg0-conf" // Configured as a Jenkins secret file
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend Integration Tests') {
            steps {
                dir('backend') {
                    sh 'npm install'
                    sh 'npm test'
                }
            }
        }

        stage('Frontend Build Verification') {
            steps {
                dir('frontend') {
                    sh 'npm install'
                    sh 'npm run build'
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                script {
                    echo "Building Docker images for MERN services..."
                    sh "docker build -t ${BACKEND_IMAGE}:${BUILD_NUMBER} -t ${BACKEND_IMAGE}:latest ./backend"
                    sh "docker build -t ${FRONTEND_IMAGE}:${BUILD_NUMBER} -t ${FRONTEND_IMAGE}:latest ./frontend"
                }
            }
        }

        stage('Connect WireGuard VPN') {
            steps {
                script {
                    echo "Establishing secure WireGuard tunnel to Azure Virtual Network..."
                    // Retrieve client config from Jenkins credentials and write to runtime configuration path
                    configFileProvider([configFile(fileId: "${WG_CONFIG_CREDS_ID}", variable: 'WG_CONFIG_PATH')]) {
                        sh "sudo cp ${WG_CONFIG_PATH} /etc/wireguard/wg0.conf"
                        sh "sudo chmod 600 /etc/wireguard/wg0.conf"
                        sh "sudo wg-quick up wg0"
                    }
                }
            }
        }

        stage('Push to Azure ACR') {
            steps {
                script {
                    echo "Publishing container images to Azure Container Registry..."
                    withCredentials([usernamePassword(credentialsId: "${ACR_CREDS_ID}", usernameVariable: 'ACR_USER', passwordVariable: 'ACR_PASS')]) {
                        sh "docker login ${ACR_REGISTRY} -u ${ACR_USER} -p ${ACR_PASS}"
                        sh "docker push ${BACKEND_IMAGE}:${BUILD_NUMBER}"
                        sh "docker push ${BACKEND_IMAGE}:latest"
                        sh "docker push ${FRONTEND_IMAGE}:${BUILD_NUMBER}"
                        sh "docker push ${FRONTEND_IMAGE}:latest"
                    }
                }
            }
        }

        stage('Deploy to Azure VM (Secure Private IP)') {
            steps {
                script {
                    echo "Deploying update to Azure Virtual Machine..."
                    sshagent(credentials: ["${SSH_CREDS_ID}"]) {
                        // 1. Copy Docker Compose config to remote host
                        sh "scp -o StrictHostKeyChecking=no docker-compose.yml ${AZURE_VM_USER}@${AZURE_VM_PRIVATE_IP}:/home/${AZURE_VM_USER}/docker-compose.yml"
                        
                        // 2. Fetch remote deployment variables and login remote docker to ACR
                        withCredentials([usernamePassword(credentialsId: "${ACR_CREDS_ID}", usernameVariable: 'ACR_USER', passwordVariable: 'ACR_PASS')]) {
                            sh """
                                ssh -o StrictHostKeyChecking=no ${AZURE_VM_USER}@${AZURE_VM_PRIVATE_IP} '
                                    docker login ${ACR_REGISTRY} -u ${ACR_USER} -p ${ACR_PASS}
                                    cd /home/${AZURE_VM_USER}
                                    docker compose pull
                                    docker compose up -d --remove-orphans
                                    docker image prune -f
                                '
                            """
                        }
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                echo "Cleaning up local workspace..."
                // Always disconnect VPN link to avoid blocking pipeline nodes
                sh 'sudo wg-quick down wg0 || true'
                // Clean up ACR session login keys
                sh "docker logout ${ACR_REGISTRY} || true"
            }
        }
    }
}
