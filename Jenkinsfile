@Library('my-shared-library') _

pipeline {
    agent any

    stages {
        stage('Deploy React Backend') {
            steps {
                script {

                    slackSend(
                        channel: '#proj-jagrut-malwa',
                        message: "🚀 *Pipeline Started* | *Project:* ${env.JOB_NAME} | *Branch:* ${env.BRANCH_NAME}"

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
                channel:'#proj-jagrut-malwa',
                message: " *Pipeline Sucessful* | *Project:* ${env.JOB_NAME} | *Branch:* ${env.BRANCH_NAME}"
                
            )
        }

        failure {
            slackSend(
                channel: '#proj-jagrut-malwa',
                message: "🚀 *Pipeline Failed* | *Project:* ${env.JOB_NAME} | *Branch:* ${env.BRANCH_NAME}"
              
            )
        }
    }
}