// 小兔鲜商城 · CI/CD 流水线
// 流程：拉代码 → 构建镜像（容器内编译前端）→ 部署 → 健康检查，失败自动回滚
pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    timeout(time: 30, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    IMAGE        = 'leaf-shopping-app'
    PROJECT_NAME = 'leaf-shopping'
    APP_PORT     = '8080'
    NPM_REGISTRY = 'https://registry.npmmirror.com'
  }

  stages {
    stage('拉取代码') {
      steps {
        checkout scm
        sh '''
          echo "构建号: $BUILD_NUMBER"
          echo "提交  : $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
          echo "说明  : $(git log -1 --pretty=%s 2>/dev/null || echo -)"
        '''
      }
    }

    stage('构建镜像') {
      steps {
        sh 'docker build -f Dockerfile.build --build-arg NPM_REGISTRY=$NPM_REGISTRY -t $IMAGE:$BUILD_NUMBER -t $IMAGE:latest .'
      }
    }

    stage('部署') {
      steps {
        sh 'docker tag $IMAGE:latest $IMAGE:previous 2>/dev/null || true'
        sh 'docker compose -p $PROJECT_NAME up -d --force-recreate --no-build'
      }
    }

    stage('健康检查') {
      steps {
        sh '''
          for i in $(seq 1 20); do
            if curl -fsS "http://127.0.0.1:$APP_PORT/" >/dev/null 2>&1; then
              echo "健康检查通过（第 $i 次尝试）"
              curl -s -o /dev/null -w "指标接口 HTTP: %{http_code}" "http://127.0.0.1:$APP_PORT/metrics"
              echo
              exit 0
            fi
            echo "第 $i 次未就绪，等 3 秒"
            sleep 3
          done
          echo "健康检查失败"
          exit 1
        '''
      }
    }
  }

  post {
    failure {
      echo '构建或部署失败，尝试回滚到上一个可用镜像'
      sh '''
        if docker image inspect $IMAGE:previous >/dev/null 2>&1; then
          docker tag $IMAGE:previous $IMAGE:latest
          docker compose -p $PROJECT_NAME up -d --force-recreate --no-build
          echo "已回滚到上一个版本"
        else
          echo "没有可回滚的镜像（首次构建），跳过"
        fi
      '''
    }
    success {
      echo '部署成功，访问 http://<服务器IP>:8080'
    }
  }
}
