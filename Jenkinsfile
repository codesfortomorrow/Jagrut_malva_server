@Library('my-shared-library') _

pipeline {
    agent any

    stages {
        stage('Deploy Backend') {
            steps {
                script {

                    slackSend(
                        channel: '#team--devops',
                        message: "🚀 *Pipeline Started*\n" +
                                 "*Project:* ${env.JOB_NAME}\n" +
                                 "*Branch:* ${env.BRANCH_NAME}\n" +
                                 "*Build:* #${env.BUILD_NUMBER}"
                    )

                    if (env.BRANCH_NAME == 'staging') {

                        deployBackend(
                            server: 'jagrut-server',
                            branch: 'staging'
                        )

                    } else {

                        error(
                            "Deployment not configured for branch: ${env.BRANCH_NAME}"
                        )
                    }
                }
            }
        }
    }

    post {

        success {
            slackSend(
                channel: '#team--devops',
                message: "✅ *Pipeline SUCCESS*\n" +
                         "*Project:* ${env.JOB_NAME}\n" +
                         "*Branch:* ${env.BRANCH_NAME}\n" +
                         "*Build:* #${env.BUILD_NUMBER}"
            )
        }

        failure {
            slackSend(
                channel: '#team--devops',
                message: "❌ *Pipeline FAILED*\n" +
                         "*Project:* ${env.JOB_NAME}\n" +
                         "*Branch:* ${env.BRANCH_NAME}\n" +
                         "*Build:* #${env.BUILD_NUMBER}"
            )
        }
    }
}