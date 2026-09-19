@Library('my-shared-library') _

pipeline {
    agent any

    stages {
        stage('Deploy Backend') {
            steps {
                script {
                    if (env.BRANCH_NAME == 'staging') {

                        deployBackend(
                            server: 'jagrut-server',
                            branch: 'staging'
                        )
                    }
                    } else {

                        error("Deployment not configured for branch: ${env.BRANCH_NAME}")
                    }
                }
            }
        }
    }
}