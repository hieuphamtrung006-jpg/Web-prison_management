# backend/ai_engine.py_thuật toán GA
import random
from typing import List, Dict

class GeneticAlgorithmScheduler:
    def __init__(self, prisoners, projects, shifts, config, pop_size=50, generations=100):
        self.prisoners = prisoners
        self.projects = projects
        self.shifts = shifts
        self.config = config
        
        # Thông số cấu hình của thuật toán GA
        self.pop_size = pop_size
        self.generations = generations
        self.mutation_rate = 0.1 # Tỷ lệ đột biến (10%)

    def generate_random_schedule(self) -> List[Dict]:
        """Tạo ra 1 cá thể (1 bộ lịch trình ngẫu nhiên cho tất cả tù nhân)"""
        schedule = []
        for p in self.prisoners:
            # Ngẫu nhiên chọn 1 dự án và 1 ca làm việc
            proj = random.choice(self.projects)
            shift = random.choice(self.shifts)
            schedule.append({
                "PrisonerID": p.PrisonerID,
                "ProjectID": proj.ProjectID,
                "ShiftID": shift.ShiftID,
                "RiskLevel": p.RiskLevel,
                "Revenue": proj.RevenuePerHour
            })
        return schedule

    def calculate_fitness(self, schedule: List[Dict]) -> float:
        """Hàm độ thích nghi: Đánh giá xem lịch trình này tốt đến mức nào"""
        score = 0.0
        w_econ = float(self.config.WeightEconomy)
        w_sec = float(self.config.WeightSecurity)
        # w_rehab = float(self.config.WeightRehab)

        for assignment in schedule:
            # 1. Tiêu chí Kinh tế: Dự án càng nhiều tiền, điểm càng cao
            score += float(assignment["Revenue"]) * w_econ
            
            # 2. Tiêu chí An ninh: Tù nhân High Risk mà làm ca đêm hoặc dự án đông người sẽ bị TRỪ điểm
            if assignment["RiskLevel"] == 'High':
                score -= 10.0 * w_sec # Phạt nặng để AI né việc này ra

        return score

    def crossover(self, parent1: List[Dict], parent2: List[Dict]) -> List[Dict]:
        """Lai ghép: Cắt đôi lịch trình của Bố và Mẹ để ghép thành Con"""
        split_point = len(parent1) // 2
        child = parent1[:split_point] + parent2[split_point:]
        return child

    def mutate(self, schedule: List[Dict]) -> List[Dict]:
        """Đột biến: Đôi khi ngẫu nhiên thay đổi ca làm của 1 tù nhân để tìm hướng đi mới"""
        for assignment in schedule:
            if random.random() < self.mutation_rate:
                assignment["ProjectID"] = random.choice(self.projects).ProjectID
                assignment["ShiftID"] = random.choice(self.shifts).ShiftID
        return schedule

    def run(self):
        """Khởi chạy vòng lặp tiến hóa"""
        # 1. Khởi tạo quần thể ban đầu
        population = [self.generate_random_schedule() for _ in range(self.pop_size)]

        # 2. Tiến hóa qua nhiều thế hệ
        for generation in range(self.generations):
            # Tính điểm cho từng lịch trình
            pop_scored = [(ind, self.calculate_fitness(ind)) for ind in population]
            # Sắp xếp từ điểm cao xuống thấp
            pop_scored.sort(key=lambda x: x[1], reverse=True)
            
            # Giữ lại 20% cá thể tinh anh nhất (Elitism)
            next_generation = [ind for ind, score in pop_scored[: int(self.pop_size * 0.2)]]

            # Lai ghép để tạo ra phần còn lại
            while len(next_generation) < self.pop_size:
                parent1 = random.choice(pop_scored[:20])[0] # Chọn ngẫu nhiên trong top 20 tốt nhất
                parent2 = random.choice(pop_scored[:20])[0]
                child = self.crossover(parent1, parent2)
                child = self.mutate(child)
                next_generation.append(child)

            population = next_generation

        # Trả về lịch trình có điểm số cao nhất ở thế hệ cuối cùng
        best_schedule = population[0]
        return best_schedule