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
                    script {
                        runCmd 'npm install'
                        runCmd 'npm test'
                    }
                }
            }
        }

        stage('Frontend Build Verification') {
            steps {
                dir('frontend') {
                    script {
                        runCmd 'npm install'
                        runCmd 'npm run build'
                    }
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                script {
                    echo "Building Docker images for MERN services..."
                    runCmd "docker build -t ${BACKEND_IMAGE}:${BUILD_NUMBER} -t ${BACKEND_IMAGE}:latest ./backend"
                    runCmd "docker build -t ${FRONTEND_IMAGE}:${BUILD_NUMBER} -t ${FRONTEND_IMAGE}:latest ./frontend"
                }
            }
        }

        stage('Connect WireGuard VPN') {
            steps {
                script {
                    echo "Establishing secure WireGuard tunnel to Azure Virtual Network..."
                    configFileProvider([configFile(fileId: "${WG_CONFIG_CREDS_ID}", variable: 'WG_CONFIG_PATH')]) {
                        if (isUnix()) {
                            sh "sudo cp ${WG_CONFIG_PATH} /etc/wireguard/wg0.conf"
                            sh "sudo chmod 600 /etc/wireguard/wg0.conf"
                            sh "sudo wg-quick up wg0"
                        } else {
                            echo "Executing Windows-native WireGuard service installation..."
                            bat "copy \"${WG_CONFIG_PATH}\" \"${WORKSPACE}\\wg0.conf\""
                            bat "\"C:\\Program Files\\WireGuard\\wireguard.exe\" /installtunnelservice \"${WORKSPACE}\\wg0.conf\""
                        }
                    }
                }
            }
        }

        stage('Push to Azure ACR') {
            steps {
                script {
                    echo "Publishing container images to Azure Container Registry..."
                    withCredentials([usernamePassword(credentialsId: "${ACR_CREDS_ID}", usernameVariable: 'ACR_USER', passwordVariable: 'ACR_PASS')]) {
                        runCmd "docker login ${ACR_REGISTRY} -u ${ACR_USER} -p ${ACR_PASS}"
                        runCmd "docker push ${BACKEND_IMAGE}:${BUILD_NUMBER}"
                        runCmd "docker push ${BACKEND_IMAGE}:latest"
                        runCmd "docker push ${FRONTEND_IMAGE}:${BUILD_NUMBER}"
                        runCmd "docker push ${FRONTEND_IMAGE}:latest"
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
                        runCmd "scp -o StrictHostKeyChecking=no docker-compose.yml ${AZURE_VM_USER}@${AZURE_VM_PRIVATE_IP}:/home/${AZURE_VM_USER}/docker-compose.yml"
                        
                        // 2. Fetch remote deployment variables and login remote docker to ACR
                        withCredentials([usernamePassword(credentialsId: "${ACR_CREDS_ID}", usernameVariable: 'ACR_USER', passwordVariable: 'ACR_PASS')]) {
                            runCmd "ssh -o StrictHostKeyChecking=no ${AZURE_VM_USER}@${AZURE_VM_PRIVATE_IP} \"docker login ${ACR_REGISTRY} -u ${ACR_USER} -p ${ACR_PASS} && cd /home/${AZURE_VM_USER} && docker compose pull && docker compose up -d --remove-orphans && docker image prune -f\""
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
                if (isUnix()) {
                    sh 'sudo wg-quick down wg0 || true'
                    sh "docker logout ${ACR_REGISTRY} || true"
                } else {
                    bat '"C:\\Program Files\\WireGuard\\wireguard.exe" /uninstalltunnelservice wg0 || exit 0'
                    bat "docker logout ${ACR_REGISTRY} || exit 0"
                }
            }
        }
    }
}

// Helper function to handle cross-platform command execution
def runCmd(cmd) {
    if (isUnix()) {
        sh cmd
    } else {
        bat cmd
    }
}

