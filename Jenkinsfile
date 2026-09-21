@Library('my-shared-library') _

pipeline {
    agent any

    stages {
        stage('Deploy React Frontend') {
            steps {
                script {

                    slackSend(
                        channel: '#proj-jagrut-malwa',
                        message: "🚀 *CI-CD Pipeline Started*\n" +
                                 "*Project:* ${env.JOB_NAME}\n" +
                                 "*Branch:* ${env.BRANCH_NAME}\n" +
                                 "*Build:* #${env.BUILD_NUMBER}"
                    )

                    if (env.BRANCH_NAME == 'staging') {

                        deployStatic(
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
                channel:'#proj-jagrut-malwa',
                message: "✅ *Pipeline SUCCESS*\n" +
                         "*Project:* ${env.JOB_NAME}\n" +
                         "*Branch:* ${env.BRANCH_NAME}\n" +
                         "*Build:* #${env.BUILD_NUMBER}"
            )
        }

        failure {
            slackSend(
                channel: '#proj-jagrut-malwa',
                message: "❌ *Pipeline FAILED*\n" +
                         "*Project:* ${env.JOB_NAME}\n" +
                         "*Branch:* ${env.BRANCH_NAME}\n" +
                         "*Build:* #${env.BUILD_NUMBER}"
            )
        }
    }
}